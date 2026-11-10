import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { SocialPlatform } from '@common/constants/domain.constant';
import { can, isManager, projectScope } from '@common/helpers/access';
import { postInclude, scheduleInclude, ticketListInclude, toPost, toSchedule, toTicket } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { NotificationsService } from '@modules/activity/notifications.service';
import { AiProvidersService } from '@modules/ai/ai-providers.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { SocialService } from './social.service';
import { CreatePostDto, MetricsDto, ScheduleDto, UpdatePostDto, UpdateScheduleDto } from './core/dto/content.dto';
import { Media, PlatformError, fetchMetrics, publish } from './core/helpers/platforms';

const LABEL: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X' };
const LIMIT: Record<string, number> = { youtube: 5000, instagram: 2200, facebook: 63206, tiktok: 2200, linkedin: 3000, x: 280 };
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Tanggal & jam WIB → Date UTC. */
const wib = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);
/** Tanggal hari ini di WIB (YYYY-MM-DD). */
const todayWib = (offsetDays = 0) => new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);

const postWithTicket = {
  ...postInclude,
  channel: true,
  ticket: { select: { id: true, key: true, title: true, project_id: true, assignee_id: true, reporter_id: true, content_format: true, project: { select: { slug: true, lead_id: true } } } },
} satisfies Prisma.ContentPostInclude;
type PostFull = Prisma.ContentPostGetPayload<{ include: typeof postWithTicket }>;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private social: SocialService,
    private ai: AiProvidersService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // ---------- helper ----------

  private canPublish(user: JwtPayload, project: { lead_id: number | null }) {
    return isManager(user) || project.lead_id === user.userId || can(user, PERMISSIONS.CONTENT.PUBLISH);
  }

  private async ticket(user: JwtPayload, key: string) {
    const t = await this.prisma.ticket.findFirst({
      where: { key: key.toUpperCase(), deleted_at: null, project: { deleted_at: null, ...projectScope(user) } },
      include: { project: true },
    });
    if (!t) throw new NotFoundException(`Tiket ${key} tidak ditemukan`);
    return t;
  }

  private async post(user: JwtPayload, id: number): Promise<PostFull> {
    const p = await this.prisma.contentPost.findFirst({
      where: { id, ticket: { deleted_at: null, project: { deleted_at: null, ...projectScope(user) } } },
      include: postWithTicket,
    });
    if (!p) throw new NotFoundException('Postingan tidak ditemukan');
    return p;
  }

  private async ticketOut(id: number) {
    return toTicket(await this.prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketListInclude }));
  }

  private validateReady(p: { caption: string; scheduled_at: Date | null; channel: { platform: string } }) {
    if (!p.caption.trim()) throw new BadRequestException('Caption masih kosong');
    if (!p.scheduled_at) throw new BadRequestException('Isi jadwal tayang dulu');
    if (p.caption.length > LIMIT[p.channel.platform]) throw new BadRequestException(`Caption melebihi batas ${LIMIT[p.channel.platform]} karakter ${LABEL[p.channel.platform]}`);
  }

  // ---------- akun per proyek ----------

  private async assertChannelForProject(channelId: number, projectId: number) {
    const ok = await this.prisma.projectChannel.findFirst({ where: { channel_id: channelId, project_id: projectId, channel: { deleted_at: null } } });
    if (!ok) throw new BadRequestException('Akun sosmed ini belum diizinkan untuk proyek tersebut');
  }

  // ---------- konten di tiket ----------

  async setFormat(user: JwtPayload, key: string, format: string | null) {
    const t = await this.ticket(user, key);
    await this.prisma.ticket.update({ where: { id: t.id }, data: { content_format: format, ...(format ? { type: 'konten' } : {}) } });
    return this.ticketOut(t.id);
  }

  async addPost(user: JwtPayload, key: string, dto: CreatePostDto) {
    const t = await this.ticket(user, key);
    await this.assertChannelForProject(dto.channelId, t.project_id);
    const first = await this.prisma.contentPost.findFirst({ where: { ticket_id: t.id }, orderBy: { id: 'asc' } });
    await this.prisma.contentPost.create({
      data: {
        ticket_id: t.id,
        channel_id: dto.channelId,
        title: dto.title,
        caption: dto.caption ?? first?.caption ?? '',
        scheduled_at: dto.scheduledAt ? new Date(dto.scheduledAt) : first?.scheduled_at ?? (t.due_date ? wib(t.due_date.toISOString().slice(0, 10), '19:00') : null),
      },
    });
    if (!t.content_format) await this.prisma.ticket.update({ where: { id: t.id }, data: { content_format: 'reels', type: 'konten' } });
    return this.ticketOut(t.id);
  }

  async updatePost(user: JwtPayload, id: number, dto: UpdatePostDto) {
    const p = await this.post(user, id);
    if (['tayang', 'memproses'].includes(p.status)) throw new BadRequestException('Postingan yang sudah/sedang tayang tidak bisa diubah');
    // Mengubah isi atau jadwal membatalkan persetujuan.
    const reset = p.status === 'terjadwal' || p.status === 'menunggu';
    const row = await this.prisma.contentPost.update({
      where: { id },
      data: {
        title: dto.title,
        caption: dto.caption,
        scheduled_at: dto.scheduledAt === undefined ? undefined : dto.scheduledAt === null ? null : new Date(dto.scheduledAt),
        ...(reset ? { status: 'draf', approved_by: null, approved_at: null } : {}),
        error: null,
      },
      include: postInclude,
    });
    if (reset) await this.prisma.approval.updateMany({ where: { content_post_id: id, status: 'menunggu' }, data: { status: 'ditolak', decided_at: new Date() } });
    return toPost(row);
  }

  async removePost(user: JwtPayload, id: number) {
    const p = await this.post(user, id);
    if (p.status === 'tayang' || p.status === 'memproses') throw new BadRequestException('Postingan yang sudah tayang tidak bisa dihapus dari tiket');
    await this.prisma.contentPost.delete({ where: { id } });
    return { deleted: true };
  }

  /** Ajukan untuk disetujui. Bila diajukan agent, muncul di halaman Persetujuan. */
  async submit(user: JwtPayload, id: number) {
    const p = await this.post(user, id);
    if (p.status !== 'draf' && p.status !== 'gagal') throw new BadRequestException('Hanya draf yang bisa diajukan');
    this.validateReady(p);
    await this.prisma.contentPost.update({ where: { id }, data: { status: 'menunggu', error: null } });
    const when = p.scheduled_at!.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (user.kind === 'agent') {
      await this.prisma.approval.create({
        data: {
          agent_id: user.userId,
          project_id: p.ticket.project_id,
          kind: 'publikasi',
          risk: 'sedang',
          title: `Tayangkan ${p.ticket.key} di ${LABEL[p.channel.platform]} ${p.channel.handle}`,
          detail: `Jadwal ${when} WIB. ${p.channel.mode === 'manual' ? 'Akun mode manual: penanggung jawab diingatkan untuk memposting.' : 'Diposting otomatis lewat API.'}`,
          preview: [p.title, p.caption].filter(Boolean).join('\n\n'),
          content_post_id: id,
        },
      });
    }
    await this.notifications.notify({
      recipientIds: [p.ticket.project.lead_id],
      actorId: user.userId,
      kind: 'approval',
      text: `meminta persetujuan tayang di ${LABEL[p.channel.platform]}`,
      target: `${p.ticket.key} ${p.ticket.title}`,
      href: user.kind === 'agent' ? '/persetujuan' : `/proyek/${p.ticket.project.slug}/tiket/${p.ticket.key}`,
      project: p.ticket.project.slug,
    });
    return toPost(await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postInclude }));
  }

  async approve(user: JwtPayload, id: number) {
    const p = await this.post(user, id);
    if (!this.canPublish(user, p.ticket.project)) throw new ForbiddenException('Hanya lead proyek, Admin, atau pemegang izin PUBLISH_CONTENT yang bisa menyetujui tayang');
    if (!['draf', 'menunggu', 'gagal'].includes(p.status)) throw new BadRequestException('Postingan ini tidak menunggu persetujuan');
    this.validateReady(p);
    const row = await this.prisma.contentPost.update({
      where: { id },
      data: { status: 'terjadwal', approved_by: user.userId, approved_at: new Date(), error: null, reminded_at: null },
      include: postInclude,
    });
    await this.prisma.approval.updateMany({ where: { content_post_id: id, status: 'menunggu' }, data: { status: 'disetujui', decided_by: user.userId, decided_at: new Date() } });
    await this.audit.log(user.userId, 'menyetujui jadwal tayang', `${p.ticket.key} · ${LABEL[p.channel.platform]} ${p.channel.handle}`, 'proyek');
    return toPost(row);
  }

  async unschedule(user: JwtPayload, id: number) {
    const p = await this.post(user, id);
    if (p.status !== 'terjadwal' && p.status !== 'menunggu') throw new BadRequestException('Postingan ini tidak sedang terjadwal');
    return toPost(await this.prisma.contentPost.update({ where: { id }, data: { status: 'draf', approved_by: null, approved_at: null }, include: postInclude }));
  }

  async publishNow(user: JwtPayload, id: number) {
    const p = await this.post(user, id);
    if (!this.canPublish(user, p.ticket.project)) throw new ForbiddenException('Hanya lead proyek, Admin, atau pemegang izin PUBLISH_CONTENT yang bisa menayangkan');
    if (p.channel.mode !== 'otomatis' || !p.channel.access_token_enc) throw new BadRequestException('Akun ini mode manual: posting sendiri lalu tandai sudah tayang dengan link-nya');
    if (p.status === 'tayang' || p.status === 'memproses') throw new BadRequestException('Postingan sudah/sedang ditayangkan');
    this.validateReady({ ...p, scheduled_at: p.scheduled_at ?? new Date() });
    await this.prisma.contentPost.update({ where: { id }, data: { status: 'memproses', approved_by: p.approved_by ?? user.userId, approved_at: p.approved_at ?? new Date() } });
    await this.runPublish(id);
    return toPost(await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postInclude }));
  }

  async markPublished(user: JwtPayload, id: number, url: string) {
    const p = await this.post(user, id);
    if (p.status === 'tayang') throw new BadRequestException('Sudah ditandai tayang');
    await this.prisma.contentPost.update({
      where: { id },
      data: { status: 'tayang', url, published_at: new Date(), approved_by: p.approved_by ?? user.userId, approved_at: p.approved_at ?? new Date(), error: null },
    });
    await this.afterPublished(id);
    return toPost(await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postInclude }));
  }

  /** Statistik manual (akun tanpa API, mis. LinkedIn pribadi). */
  async setMetrics(user: JwtPayload, id: number, dto: MetricsDto) {
    const p = await this.post(user, id);
    if (p.status !== 'tayang') throw new BadRequestException('Statistik hanya untuk postingan yang sudah tayang');
    return toPost(await this.prisma.contentPost.update({ where: { id }, data: { metrics: { ...dto }, metrics_at: new Date() }, include: postInclude }));
  }

  async refreshMetrics(user: JwtPayload, id: number) {
    await this.post(user, id);
    await this.pullMetrics(id);
    return toPost(await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postInclude }));
  }

  // ---------- publikasi (dipakai juga oleh runner) ----------

  private async mediaFor(ticketId: number): Promise<Media[]> {
    const files = await this.prisma.attachment.findMany({ where: { ticket_id: ticketId, url: { not: null } }, orderBy: { created_at: 'asc' } });
    return files.map((f) => ({ url: f.url!, kind: f.kind, name: f.name }));
  }

  /** Jalankan/teruskan unggahan untuk postingan berstatus "memproses". */
  async runPublish(id: number) {
    const p = await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postWithTicket });
    try {
      const token = await this.social.tokenFor(p.channel_id);
      const r = await publish({
        platform: p.channel.platform as SocialPlatform,
        token,
        externalId: p.channel.external_id!,
        handle: p.channel.handle,
        meta: (p.channel.meta as Record<string, unknown>) ?? {},
        format: p.ticket.content_format ?? 'teks',
        title: p.title,
        caption: p.caption,
        media: await this.mediaFor(p.ticket_id),
        remote: (p.remote as Record<string, unknown>) ?? null,
      });
      if (r.status === 'memproses') {
        await this.prisma.contentPost.update({ where: { id }, data: { remote: r.remote as Prisma.InputJsonValue } });
        return;
      }
      await this.prisma.contentPost.update({
        where: { id },
        data: { status: 'tayang', external_id: r.externalId, url: r.url, published_at: new Date(), remote: Prisma.DbNull, error: null, metrics: { views: 0, likes: 0, comments: 0, shares: 0 } },
      });
      await this.afterPublished(id);
    } catch (e) {
      const msg = e instanceof PlatformError ? e.message : `Galat tak terduga: ${(e as Error).message}`;
      this.logger.warn(`Publikasi #${id} gagal: ${msg}`);
      await this.prisma.contentPost.update({ where: { id }, data: { status: 'gagal', error: msg, remote: Prisma.DbNull } });
      await this.notifications.notify({
        recipientIds: [p.ticket.assignee_id, p.ticket.project.lead_id],
        kind: 'status',
        text: `gagal menayangkan di ${LABEL[p.channel.platform]}: ${msg}`,
        target: `${p.ticket.key} ${p.ticket.title}`,
        href: `/proyek/${p.ticket.project.slug}/tiket/${p.ticket.key}`,
        project: p.ticket.project.slug,
      });
    }
  }

  /** Setelah tayang: notifikasi, dan bila semua postingan tiket tayang → tiket pindah ke status selesai. */
  private async afterPublished(id: number) {
    const p = await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postWithTicket });
    await this.notifications.notify({
      recipientIds: [p.ticket.assignee_id, p.ticket.reporter_id],
      kind: 'status',
      text: `tayang di ${LABEL[p.channel.platform]} ${p.channel.handle}`,
      target: `${p.ticket.key} ${p.ticket.title}`,
      href: p.url ?? `/proyek/${p.ticket.project.slug}/tiket/${p.ticket.key}`,
      project: p.ticket.project.slug,
    });
    const open = await this.prisma.contentPost.count({ where: { ticket_id: p.ticket_id, status: { not: 'tayang' } } });
    if (!open) {
      const done = await this.prisma.workflowStatus.findFirst({ where: { project_id: p.ticket.project_id, category: 'done' }, orderBy: { position: 'asc' } });
      if (done) await this.prisma.ticket.update({ where: { id: p.ticket_id }, data: { status_id: done.id } });
    }
  }

  async pullMetrics(id: number) {
    const p = await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: { channel: true } });
    if (p.status !== 'tayang' || !p.external_id || !p.channel.access_token_enc) return;
    try {
      const m = await fetchMetrics(p.channel.platform as SocialPlatform, await this.social.tokenFor(p.channel_id), p.external_id);
      await this.prisma.contentPost.update({ where: { id }, data: { metrics_at: new Date(), ...(m ? { metrics: { ...m } } : {}) } });
    } catch (e) {
      this.logger.warn(`Statistik #${id} gagal: ${(e as Error).message}`);
      await this.prisma.contentPost.update({ where: { id }, data: { metrics_at: new Date() } });
    }
  }

  // ---------- konten rutin ----------

  async schedules(user: JwtPayload, slug: string) {
    const p = await this.projects.findAccessible(user, slug);
    const rows = await this.prisma.contentSchedule.findMany({ where: { project_id: p.id }, include: scheduleInclude, orderBy: { id: 'asc' } });
    return rows.map(toSchedule);
  }

  private async scheduleData(projectId: number, dto: Partial<ScheduleDto>) {
    for (const id of dto.channelIds ?? []) await this.assertChannelForProject(id, projectId);
    let assignee: number | null | undefined;
    if (dto.assigneeId === null || dto.assigneeId === '') assignee = null;
    else if (dto.assigneeId) {
      const m = await this.prisma.projectMember.findFirst({ where: { project_id: projectId, user: { username: dto.assigneeId } } });
      if (!m) throw new BadRequestException(`${dto.assigneeId} bukan anggota proyek`);
      assignee = m.user_id;
    }
    return {
      title: dto.title,
      format: dto.format,
      channel_ids: dto.channelIds,
      days: dto.days ? [...new Set(dto.days)].sort() : undefined,
      time: dto.time,
      lead_days: dto.leadDays,
      assignee_id: assignee,
      checklist: dto.checklist,
      active: dto.active,
    };
  }

  async createSchedule(user: JwtPayload, slug: string, dto: ScheduleDto) {
    const p = await this.projects.findAccessible(user, slug);
    const data = await this.scheduleData(p.id, dto);
    const row = await this.prisma.contentSchedule.create({
      data: { ...data, title: dto.title, format: dto.format, channel_ids: dto.channelIds, days: data.days!, time: dto.time, project_id: p.id, created_by: user.userId },
      include: scheduleInclude,
    });
    await this.generate(row.id);
    return toSchedule(row);
  }

  async updateSchedule(user: JwtPayload, id: number, dto: UpdateScheduleDto) {
    const s = await this.prisma.contentSchedule.findFirst({ where: { id, project: { deleted_at: null, ...projectScope(user) } } });
    if (!s) throw new NotFoundException('Konten rutin tidak ditemukan');
    const row = await this.prisma.contentSchedule.update({ where: { id }, data: await this.scheduleData(s.project_id, dto), include: scheduleInclude });
    if (row.active) await this.generate(row.id);
    return toSchedule(row);
  }

  async removeSchedule(user: JwtPayload, id: number) {
    const s = await this.prisma.contentSchedule.findFirst({ where: { id, project: { deleted_at: null, ...projectScope(user) } } });
    if (!s) throw new NotFoundException('Konten rutin tidak ditemukan');
    await this.prisma.contentSchedule.delete({ where: { id } });
    return { deleted: true };
  }

  async runNow(user: JwtPayload, slug: string) {
    const p = await this.projects.findAccessible(user, slug);
    const rows = await this.prisma.contentSchedule.findMany({ where: { project_id: p.id, active: true } });
    let created = 0;
    for (const s of rows) created += await this.generate(s.id);
    return { created };
  }

  /** Buat tiket untuk kemunculan jadwal dalam H-n ke depan yang belum ada. Aman dipanggil berulang. */
  async generate(scheduleId: number): Promise<number> {
    const s = await this.prisma.contentSchedule.findUnique({ where: { id: scheduleId }, include: { project: { include: { workflow: { orderBy: { position: 'asc' } } } } } });
    if (!s || !s.active || s.project.deleted_at || !s.project.workflow.length) return 0;
    const sprint = await this.prisma.sprint.findFirst({ where: { project_id: s.project_id, state: 'aktif' } });
    const channels = await this.prisma.projectChannel.findMany({ where: { project_id: s.project_id, channel_id: { in: s.channel_ids }, channel: { deleted_at: null } } });
    let created = 0;
    for (let i = 0; i <= s.lead_days; i++) {
      const date = todayWib(i);
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (!s.days.includes(dow)) continue;
      const occurrence = new Date(`${date}T00:00:00Z`);
      const exists = await this.prisma.ticket.findFirst({ where: { schedule_id: s.id, occurrence } });
      if (exists) continue;
      const label = `${HARI[dow]} ${Number(date.slice(8))} ${BULAN[Number(date.slice(5, 7)) - 1]}`;
      try {
        await this.prisma.$transaction(async (tx) => {
          const { ticket_seq } = await tx.project.update({ where: { id: s.project_id }, data: { ticket_seq: { increment: 1 } }, select: { ticket_seq: true } });
          const reporter = s.created_by ?? s.project.lead_id ?? s.assignee_id;
          if (!reporter) throw new Error('Jadwal tanpa pembuat/lead');
          const t = await tx.ticket.create({
            data: {
              key: `${s.project.key}-${ticket_seq}`,
              number: ticket_seq,
              project_id: s.project_id,
              title: `${s.title} · ${label}`,
              description: `Dibuat otomatis dari konten rutin **${s.title}**. Tayang ${label} pukul ${s.time} WIB.`,
              type: 'konten',
              content_format: s.format,
              status_id: s.project.workflow[0].id,
              priority: 'sedang',
              labels: [['video', 'reels', 'short'].includes(s.format) ? 'Video' : 'Sosmed'],
              due_date: occurrence,
              rank: Date.now(),
              assignee_id: s.assignee_id,
              reporter_id: reporter,
              sprint_id: sprint?.id,
              schedule_id: s.id,
              occurrence,
              checklist: { create: s.checklist.map((text, position) => ({ text, position })) },
              posts: { create: channels.map((c) => ({ channel_id: c.channel_id, scheduled_at: wib(date, s.time) })) },
            },
          });
          if (s.assignee_id) {
            await this.notifications.notify({
              recipientIds: [s.assignee_id],
              kind: 'assign',
              text: 'mendapat tiket konten rutin',
              target: `${t.key} ${t.title}`,
              href: `/proyek/${s.project.slug}/tiket/${t.key}`,
              project: s.project.slug,
            });
          }
        });
        created++;
      } catch (e) {
        // Kemunculan sudah dibuat proses lain (unik schedule_id + occurrence).
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    return created;
  }

  // ---------- kalender & laporan ----------

  async calendar(user: JwtPayload, slug: string, from: string, to: string) {
    const p = await this.projects.findAccessible(user, slug);
    const start = new Date(`${from.slice(0, 10)}T00:00:00+07:00`);
    const end = new Date(`${to.slice(0, 10)}T23:59:59+07:00`);
    const rows = await this.prisma.ticket.findMany({
      where: {
        project_id: p.id,
        deleted_at: null,
        OR: [
          { posts: { some: { OR: [{ scheduled_at: { gte: start, lte: end } }, { published_at: { gte: start, lte: end } }] } } },
          { posts: { none: {} }, due_date: { gte: new Date(`${from.slice(0, 10)}T00:00:00Z`), lte: new Date(`${to.slice(0, 10)}T00:00:00Z`) } },
        ],
      },
      include: ticketListInclude,
      orderBy: { due_date: 'asc' },
    });
    return rows.map(toTicket);
  }

  async report(user: JwtPayload, slug: string, days = 30) {
    const p = await this.projects.findAccessible(user, slug);
    const since = new Date(Date.now() - days * 86400_000);
    const posts = await this.prisma.contentPost.findMany({
      where: { status: 'tayang', published_at: { gte: since }, ticket: { project_id: p.id, deleted_at: null } },
      include: { ...postInclude, ticket: { select: { key: true, title: true } } },
      orderBy: { published_at: 'desc' },
    });
    type M = { views: number; likes: number; comments: number; shares: number };
    const m = (x: { metrics: unknown }) => (x.metrics as M | null) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
    const sum = (list: typeof posts) =>
      list.reduce((a, x) => ({ views: a.views + m(x).views, likes: a.likes + m(x).likes, comments: a.comments + m(x).comments, shares: a.shares + m(x).shares }), { views: 0, likes: 0, comments: 0, shares: 0 });
    const total = sum(posts);
    const platforms = [...new Set(posts.map((x) => x.channel.platform))].map((platform) => {
      const list = posts.filter((x) => x.channel.platform === platform);
      const t = sum(list);
      return { platform, posts: list.length, ...t, engagementRate: t.views ? (t.likes + t.comments + t.shares) / t.views : 0 };
    });
    const upcoming = await this.prisma.contentPost.groupBy({
      by: ['status'],
      where: { ticket: { project_id: p.id, deleted_at: null }, status: { in: ['draf', 'menunggu', 'terjadwal', 'gagal'] } },
      _count: true,
    });
    return {
      days,
      totals: { posts: posts.length, ...total, engagementRate: total.views ? (total.likes + total.comments + total.shares) / total.views : 0 },
      platforms,
      top: [...posts].sort((a, b) => m(b).views - m(a).views).slice(0, 10).map((x) => ({ ...toPost(x), ticketKey: x.ticket.key, ticketTitle: x.ticket.title })),
      pipeline: Object.fromEntries(upcoming.map((u) => [u.status, u._count])),
    };
  }

  // ---------- agent ----------

  private async agentFor(username: string, projectId: number) {
    const a = await this.prisma.user.findFirst({
      where: { username, kind: 'agent', is_active: true, deleted_at: null, project_members: { some: { project_id: projectId } } },
      include: { agent_profile: true },
    });
    if (!a?.agent_profile) throw new BadRequestException(`Agent ${username} bukan anggota proyek ini`);
    const prof = a.agent_profile;
    if (prof.budget && prof.spent >= prof.budget) throw new BadRequestException(`${a.display_name} sudah mencapai batas biaya bulan ini`);
    if (!prof.model_id) throw new BadRequestException(`${a.display_name} belum punya model AI`);
    const pinned = ((prof.learnings as { title: string; body: string; pinned?: boolean }[]) ?? []).filter((l) => l.pinned);
    const system = [
      `Kamu adalah ${a.display_name}, ${a.role} di Kuli Digital (perusahaan software & konten di Indonesia).`,
      prof.description,
      pinned.length ? `Aturan yang wajib diikuti:\n${pinned.map((l) => `- ${l.title}: ${l.body}`).join('\n')}` : '',
      'Tulis dalam Bahasa Indonesia yang natural. Jangan menambahkan penjelasan di luar teks yang diminta.',
    ].filter(Boolean).join('\n\n');
    return { a, prof, system };
  }

  private async recordRun(agentId: number, projectId: number, ticketId: number, title: string, started: Date, r: { tokensIn: number; tokensOut: number }, step: string) {
    const secs = Math.max(1, Math.round((Date.now() - started.getTime()) / 1000));
    const run = await this.prisma.agentRun.create({
      data: {
        code: `run-${Date.now().toString(36)}`,
        agent_id: agentId,
        project_id: projectId,
        ticket_id: ticketId,
        title,
        status: 'berhasil',
        started_at: started,
        duration: secs < 60 ? `${secs} dtk` : `${Math.round(secs / 60)} mnt`,
        tokens_in: r.tokensIn,
        tokens_out: r.tokensOut,
        steps: [{ t: started.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }), kind: 'hasil', title: step }],
      },
    });
    await this.prisma.agentProfile.update({ where: { user_id: agentId }, data: { tasks_done: { increment: 1 } } });
    return run;
  }

  /** Agent menulis caption (dan judul YouTube) untuk satu postingan. Hasil tetap draf; tayang lewat persetujuan. */
  async agentDraft(user: JwtPayload, id: number, agent: string, instructions?: string) {
    const p = await this.post(user, id);
    if (['tayang', 'memproses'].includes(p.status)) throw new BadRequestException('Postingan sudah tayang');
    const t = await this.prisma.ticket.findUniqueOrThrow({ where: { id: p.ticket_id } });
    const { a, prof, system } = await this.agentFor(agent, t.project_id);
    const pl = p.channel.platform;
    const prompt = [
      pl === 'youtube'
        ? `Tulis judul (maks. 100 karakter) dan deskripsi video YouTube. Baris pertama: "JUDUL: <judul>", lalu baris kosong, lalu deskripsi.`
        : `Tulis caption ${LABEL[pl]} untuk format ${t.content_format ?? 'postingan'}. Maksimal ${LIMIT[pl]} karakter.${pl === 'x' && t.content_format === 'thread' ? ' Pisahkan tiap bagian thread dengan satu baris kosong; tiap bagian maks. 280 karakter.' : ''}`,
      `Topik tiket: ${t.title}`,
      t.description ? `Brief:\n${t.description}` : '',
      p.caption ? `Draf sebelumnya (boleh diperbaiki):\n${p.caption}` : '',
      instructions ? `Arahan tambahan: ${instructions}` : '',
      'Balas hanya dengan teksnya.',
    ].filter(Boolean).join('\n\n');
    const started = new Date();
    const r = await this.ai.chat(prof.provider, prof.model_id!, system, prompt, 1200);
    let title = p.title;
    let caption = r.text;
    if (pl === 'youtube') {
      const m = /^JUDUL:\s*(.+)\n+/i.exec(r.text);
      if (m) {
        title = m[1].trim().slice(0, 100);
        caption = r.text.slice(m[0].length).trim();
      }
    }
    caption = caption.slice(0, LIMIT[pl]);
    await this.prisma.contentPost.update({ where: { id }, data: { caption, title, status: 'draf', approved_by: null, approved_at: null } });
    await this.prisma.comment.create({ data: { ticket_id: t.id, author_id: a.id, body: `Draf ${pl === 'youtube' ? 'judul & deskripsi' : 'caption'} ${LABEL[pl]} sudah saya isi di bagian Publikasi. Silakan dicek sebelum diajukan untuk tayang.` } });
    await this.recordRun(a.id, t.project_id, t.id, `Caption ${LABEL[pl]} · ${t.key}`, started, r, `Menulis ${r.text.length} karakter untuk ${p.channel.handle}`);
    return toPost(await this.prisma.contentPost.findUniqueOrThrow({ where: { id }, include: postInclude }));
  }

  /** Agent menulis naskah/ide/hashtag/ringkasan sebagai komentar di tiket. */
  async agentWrite(user: JwtPayload, key: string, agent: string, task: string, instructions?: string) {
    const t = await this.ticket(user, key);
    const { a, prof, system } = await this.agentFor(agent, t.project_id);
    const ask: Record<string, string> = {
      naskah: 'Tulis naskah video lengkap: hook 3 detik pertama, isi per adegan dengan durasi perkiraan, dan ajakan di akhir.',
      ide: 'Berikan 5 ide konten berbeda untuk topik ini, masing-masing dengan hook satu kalimat dan format yang cocok.',
      hashtag: 'Berikan 15 hashtag relevan (campuran populer dan niche) untuk Instagram & TikTok, dipisah spasi.',
      ringkasan: 'Ringkas status tiket ini untuk lead proyek dalam 3–5 poin.',
    };
    const prompt = [ask[task], `Tiket: ${t.title}`, t.description ? `Brief:\n${t.description}` : '', instructions ? `Arahan tambahan: ${instructions}` : ''].filter(Boolean).join('\n\n');
    const started = new Date();
    const r = await this.ai.chat(prof.provider, prof.model_id!, system, prompt, 2000);
    await this.prisma.comment.create({ data: { ticket_id: t.id, author_id: a.id, body: r.text } });
    await this.recordRun(a.id, t.project_id, t.id, `${task[0].toUpperCase()}${task.slice(1)} · ${t.key}`, started, r, `Menulis ${task}`);
    return { text: r.text, tokensIn: r.tokensIn, tokensOut: r.tokensOut };
  }
}
