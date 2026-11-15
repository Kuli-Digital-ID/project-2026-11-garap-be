import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationsService, wants } from './notifications.service';
import { MailService } from './mail.service';

const TICK_MS = 30 * 60 * 1000;
/** Pengingat hanya dikirim di jam wajar (waktu workspace) agar tidak membangunkan orang tengah malam. */
const HOURS = { from: 7, to: 20 };
/** Tiket yang terlambat lebih dari ini tidak diingatkan lagi. */
const LATE_DAYS = 7;
/** Lebih dari ini dalam satu putaran → email digabung jadi satu ringkasan. */
const MAX_SEPARATE_EMAILS = 3;

/**
 * Mengingatkan penanggung jawab tiket: jatuh tempo hari ini/besok, dan sekali saat terlambat.
 * Anti-ganda lewat dedupe_key (tiket + tanggal tenggat + tahap), jadi aman dijalankan di beberapa instance.
 */
@Injectable()
export class DueReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Pengingat');
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  onModuleInit() {
    if (String(process.env.REMINDER_RUNNER ?? 'true') === 'false') return;
    setTimeout(() => void this.run(), 20_000).unref();
    this.timer = setInterval(() => void this.run(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Tanggal & jam di zona waktu workspace. */
  private localNow(tz: string, now = new Date()) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
    const parts = Object.fromEntries(f.formatToParts(now).map((p) => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
  }

  async run(now = new Date()) {
    if (this.busy) return { sent: 0 };
    this.busy = true;
    try {
      const ws = await this.prisma.workspace.findFirst({ select: { timezone: true } });
      const tz = ws?.timezone || 'Asia/Jakarta';
      const local = this.localNow(tz, now);
      if (local.hour < HOURS.from || local.hour >= HOURS.to) return { sent: 0 };

      const today = new Date(`${local.date}T00:00:00Z`);
      const day = 86_400_000;
      const tomorrow = new Date(today.getTime() + day);
      const earliest = new Date(today.getTime() - LATE_DAYS * day);
      const tickets = await this.prisma.ticket.findMany({
        where: {
          deleted_at: null,
          assignee_id: { not: null },
          due_date: { not: null, gte: earliest, lte: tomorrow },
          status: { category: { not: 'done' } },
          assignee: { kind: 'human', is_active: true, deleted_at: null },
        },
        select: { key: true, title: true, due_date: true, assignee_id: true, project: { select: { slug: true } } },
        take: 500,
      });
      // Kelompokkan per penanggung jawab, buang yang sudah pernah diingatkan.
      const items = tickets.map((t) => {
        const due = t.due_date as Date;
        const dueStr = due.toISOString().slice(0, 10);
        const diff = Math.round((due.getTime() - today.getTime()) / day);
        return {
          t,
          diff,
          key: `due:${t.key}:${dueStr}:${diff < 0 ? 'late' : 'soon'}`,
          text: diff < 0 ? `${t.key} terlambat ${-diff} hari` : diff === 0 ? `${t.key} jatuh tempo hari ini` : `${t.key} jatuh tempo besok`,
        };
      });
      const seen = items.length ? await this.prisma.notification.findMany({ where: { dedupe_key: { in: items.map((i) => i.key) } }, select: { recipient_id: true, dedupe_key: true } }) : [];
      const done = new Set(seen.map((x) => `${x.recipient_id}|${x.dedupe_key}`));
      const byUser = new Map<number, typeof items>();
      for (const it of items) {
        const uid = it.t.assignee_id as number;
        if (done.has(`${uid}|${it.key}`)) continue;
        byUser.set(uid, [...(byUser.get(uid) ?? []), it]);
      }

      let sent = 0;
      for (const [uid, list] of byUser) {
        const digest = list.length > MAX_SEPARATE_EMAILS;
        for (const it of list) {
          await this.notifications.notify({
            recipientIds: [uid],
            kind: 'due',
            text: it.text,
            target: it.t.title,
            href: `/proyek/${it.t.project.slug}/tiket/${it.t.key}`,
            project: it.t.project.slug,
            dedupeKey: it.key,
            skipEmail: digest,
          });
          sent++;
        }
        if (digest && this.mail.enabled) {
          const u = await this.prisma.user.findUnique({ where: { id: uid }, select: { email: true, display_name: true, notif_prefs: true } });
          if (u && !u.email.endsWith('.local') && wants(u.notif_prefs, 'email', 'due')) {
            const late = list.filter((i) => i.diff < 0).length;
            const top = [...list].sort((a, b) => a.diff - b.diff).slice(0, 5).map((i) => i.text).join(' · ');
            void this.mail.sendNotification(u.email, { name: u.display_name, text: `${list.length} tiketmu perlu perhatian${late ? ` (${late} terlambat)` : ''}`, target: top, href: '/tugas-saya' });
          }
        }
      }
      if (sent) this.log.log(`${sent} pengingat dibuat`);
      return { sent };
    } catch (e) {
      this.log.warn(`Pengingat gagal: ${e instanceof Error ? e.message : e}`);
      return { sent: 0 };
    } finally {
      this.busy = false;
    }
  }
}
