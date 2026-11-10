import { Injectable, Logger, OnApplicationShutdown, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationsService } from '@modules/activity/notifications.service';
import { ContentService } from './content.service';

/**
 * Pekerja latar sederhana (tanpa dependensi tambahan), jalan tiap menit di proses API:
 * - membuat tiket dari konten rutin,
 * - menayangkan postingan terjadwal yang sudah jatuh tempo (akun manual → pengingat),
 * - melanjutkan unggahan yang masih diproses platform,
 * - memperbarui statistik postingan 30 hari terakhir tiap 6 jam.
 * Matikan dengan CONTENT_RUNNER=false (mis. bila menjalankan lebih dari satu instance).
 */
@Injectable()
export class ContentRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ContentRunner.name);
  private timer?: NodeJS.Timeout;
  private busy = false;
  private lastGenerate = 0;

  constructor(
    private prisma: PrismaService,
    private content: ContentService,
    private notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.CONTENT_RUNNER === 'false' || process.env.NODE_ENV === 'test') return;
    const every = Number(process.env.CONTENT_RUNNER_INTERVAL_MS) || 60_000;
    this.timer = setInterval(() => void this.tick(), every);
    setTimeout(() => void this.tick(), 5_000);
    this.logger.log(`Pekerja konten aktif (tiap ${Math.round(every / 1000)} dtk)`);
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.generateSchedules();
      await this.publishDue();
      await this.continueProcessing();
      await this.refreshMetrics();
    } catch (e) {
      this.logger.error(`Pekerja konten: ${(e as Error).message}`);
    } finally {
      this.busy = false;
    }
  }

  private async generateSchedules() {
    if (Date.now() - this.lastGenerate < 10 * 60_000) return;
    this.lastGenerate = Date.now();
    const rows = await this.prisma.contentSchedule.findMany({ where: { active: true }, select: { id: true } });
    let n = 0;
    for (const s of rows) n += await this.content.generate(s.id);
    if (n) this.logger.log(`${n} tiket konten rutin dibuat`);
  }

  private async publishDue() {
    const due = await this.prisma.contentPost.findMany({
      where: { status: 'terjadwal', scheduled_at: { lte: new Date() }, ticket: { deleted_at: null } },
      include: { channel: true, ticket: { select: { key: true, title: true, assignee_id: true, project: { select: { slug: true, lead_id: true } } } } },
      take: 20,
    });
    for (const p of due) {
      if (p.channel.mode !== 'otomatis' || !p.channel.access_token_enc) {
        if (p.reminded_at) continue;
        await this.prisma.contentPost.update({ where: { id: p.id }, data: { reminded_at: new Date() } });
        await this.notifications.notify({
          recipientIds: [p.ticket.assignee_id ?? p.ticket.project.lead_id],
          kind: 'status',
          text: `saatnya memposting di ${p.channel.handle} lalu menempel link-nya`,
          target: `${p.ticket.key} ${p.ticket.title}`,
          href: `/proyek/${p.ticket.project.slug}/tiket/${p.ticket.key}`,
          project: p.ticket.project.slug,
        });
        continue;
      }
      // Klaim agar tidak ditayangkan dua kali.
      const { count } = await this.prisma.contentPost.updateMany({ where: { id: p.id, status: 'terjadwal' }, data: { status: 'memproses' } });
      if (count) await this.content.runPublish(p.id);
    }
  }

  private async continueProcessing() {
    const rows = await this.prisma.contentPost.findMany({ where: { status: 'memproses' }, select: { id: true, remote: true, updated_at: true }, take: 20 });
    for (const r of rows) if (r.remote) await this.content.runPublish(r.id);
  }

  private async refreshMetrics() {
    const rows = await this.prisma.contentPost.findMany({
      where: {
        status: 'tayang',
        external_id: { not: null },
        published_at: { gte: new Date(Date.now() - 30 * 86400_000) },
        channel: { access_token_enc: { not: null } },
        OR: [{ metrics_at: null }, { metrics_at: { lt: new Date(Date.now() - 6 * 3600_000) } }],
      },
      select: { id: true },
      take: 30,
    });
    for (const r of rows) await this.content.pullMetrics(r.id);
  }
}
