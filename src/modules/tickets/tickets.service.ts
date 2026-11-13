import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { isManager, projectScope } from '@common/helpers/access';
import { attachmentSelect, ticketDetailInclude, ticketListInclude, toAttachment, toTicket } from '@common/serializers';
import { FilesService, UploadedDiskFile } from '@modules/files/files.service';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { NotificationsService } from '@modules/activity/notifications.service';
import { ProjectsService } from '@modules/projects/projects.service';
import {
  AttachmentDto, BulkUpdateDto, ChecklistItemDto, CommentDto, CreateTicketDto, LinkDto, MoveTicketDto, TicketQueryDto, UpdateTicketDto,
} from './core/dto/ticket.dto';

const day = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const kindOf = (name: string) =>
  /\.(png|jpe?g|gif|webp|svg|fig)$/i.test(name) ? 'gambar' : /\.pdf$/i.test(name) ? 'pdf' : /\.(mp4|mov|webm)$/i.test(name) ? 'video' : /\.(docx?|xlsx?|pptx?|csv|md|txt)$/i.test(name) ? 'dokumen' : 'lainnya';

type ProjectLite = { id: number; slug: string; key: string; lead_id: number | null };

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private notifications: NotificationsService,
    private files: FilesService,
  ) {}

  // ---------- helper ----------

  private async findTicket(user: JwtPayload, key: string) {
    const t = await this.prisma.ticket.findFirst({
      where: { key: key.toUpperCase(), deleted_at: null, project: { deleted_at: null, ...projectScope(user) } },
      include: { project: { select: { id: true, slug: true, key: true, lead_id: true } }, status: true },
    });
    if (!t) throw new NotFoundException(`Tiket ${key} tidak ditemukan`);
    return t;
  }

  private async detail(id: number) {
    return toTicket(await this.prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketDetailInclude }));
  }

  private async statusId(projectId: number, code?: string) {
    const s = code
      ? await this.prisma.workflowStatus.findUnique({ where: { project_id_code: { project_id: projectId, code } } })
      : await this.prisma.workflowStatus.findFirst({ where: { project_id: projectId }, orderBy: { position: 'asc' } });
    if (!s) throw new BadRequestException(`Status "${code}" tidak ada di alur kerja proyek`);
    return s;
  }

  /** Penerima tugas harus anggota proyek. undefined = tidak diubah, null = kosongkan. */
  private async assigneeId(projectId: number, username?: string | null) {
    if (username === undefined) return undefined;
    if (username === null || username === '') return null;
    const m = await this.prisma.projectMember.findFirst({ where: { project_id: projectId, user: { username } }, select: { user_id: true } });
    if (!m) throw new BadRequestException(`${username} bukan anggota proyek ini`);
    return m.user_id;
  }

  private async sprintFor(projectId: number, inSprint?: boolean, sprintId?: number | null) {
    if (sprintId !== undefined) {
      if (sprintId === null) return null;
      const s = await this.prisma.sprint.findFirst({ where: { id: sprintId, project_id: projectId, state: { not: 'selesai' } } });
      if (!s) throw new BadRequestException('Sprint tidak ditemukan atau sudah ditutup');
      return s.id;
    }
    if (inSprint === undefined) return undefined;
    if (!inSprint) return null;
    const active = await this.prisma.sprint.findFirst({ where: { project_id: projectId, state: 'aktif' } });
    return active?.id ?? null;
  }

  private async epicId(projectId: number, epicId?: number | null): Promise<number | null | undefined> {
    if (epicId === undefined) return undefined;
    if (epicId === null) return null;
    const e = await this.prisma.epic.findFirst({ where: { id: epicId, project_id: projectId, deleted_at: null } });
    if (!e) throw new BadRequestException('Epic tidak ditemukan di proyek ini');
    return e.id;
  }

  private async parentId(projectId: number, selfId: number | null, key?: string | null): Promise<number | null | undefined> {
    if (key === undefined) return undefined;
    if (key === null) return null;
    const p = await this.prisma.ticket.findFirst({ where: { key: key.toUpperCase(), project_id: projectId, deleted_at: null } });
    if (!p) throw new BadRequestException(`Tiket induk ${key} tidak ditemukan di proyek ini`);
    if (selfId !== null && (p.id === selfId || p.parent_id === selfId)) throw new BadRequestException('Relasi induk tidak valid (melingkar)');
    return p.id;
  }

  private async bottomRank(projectId: number, statusId: number) {
    const last = await this.prisma.ticket.aggregate({ where: { project_id: projectId, status_id: statusId }, _max: { rank: true } });
    return (last._max.rank ?? 0) + 1;
  }

  private href(t: { key: string }, project: { slug: string }) {
    return `/proyek/${project.slug}/tiket/${t.key}`;
  }

  // ---------- baca ----------

  async list(user: JwtPayload, q: TicketQueryDto, projectSlug?: string) {
    const slug = projectSlug ?? q.project;
    const project = slug ? await this.projects.findAccessible(user, slug) : null;

    const and: Prisma.TicketWhereInput[] = [
      { deleted_at: null, project: { deleted_at: null, ...projectScope(user) } },
    ];
    if (project) and.push({ project_id: project.id });
    if (q.status) and.push({ status: { code: q.status } });
    if (q.category) and.push({ status: { category: q.category } });
    if (q.type) and.push({ type: q.type });
    if (q.priority) and.push({ priority: q.priority });
    if (q.epic) and.push({ epic_id: q.epic });
    if (q.label) and.push({ labels: { has: q.label } });
    if (q.search) and.push({ OR: [{ title: { contains: q.search, mode: 'insensitive' } }, { key: { contains: q.search, mode: 'insensitive' } }] });

    if (q.assignee === 'me') and.push({ assignee_id: user.userId });
    else if (q.assignee === 'none') and.push({ assignee_id: null });
    else if (q.assignee) and.push({ assignee: { username: q.assignee } });

    if (q.sprint === 'active') and.push({ sprint: { state: 'aktif' } });
    else if (q.sprint === 'backlog') and.push({ sprint_id: null });
    else if (q.sprint && q.sprint !== 'all') {
      if (!/^\d+$/.test(q.sprint)) throw new BadRequestException('sprint: active, backlog, all, atau id sprint');
      and.push({ sprint_id: Number(q.sprint) });
    } else if (!q.includeArchived) and.push({ OR: [{ sprint_id: null }, { sprint: { state: { not: 'selesai' } } }] });

    const where: Prisma.TicketWhereInput = { AND: and };
    const rows = await this.prisma.ticket.findMany({
      where,
      include: ticketListInclude,
      orderBy: [{ rank: 'asc' }, { number: 'asc' }],
      take: q.limit ?? 500,
    });
    return rows.map(toTicket);
  }

  async get(user: JwtPayload, key: string) {
    const t = await this.findTicket(user, key);
    return this.detail(t.id);
  }

  // ---------- tulis ----------

  async create(user: JwtPayload, slug: string, dto: CreateTicketDto, extra: { requestId?: number } = {}) {
    const project = await this.projects.findAccessible(user, slug);
    const status = await this.statusId(project.id, dto.status);
    const assignee = await this.assigneeId(project.id, dto.assigneeId);
    const sprintId = await this.sprintFor(project.id, dto.inSprint ?? true);
    const epicId = await this.epicId(project.id, dto.epicId);
    const parentId = await this.parentId(project.id, null, dto.parentKey);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const { ticket_seq } = await tx.project.update({ where: { id: project.id }, data: { ticket_seq: { increment: 1 } }, select: { ticket_seq: true } });
      return tx.ticket.create({
        data: {
          key: `${project.key}-${ticket_seq}`,
          number: ticket_seq,
          project_id: project.id,
          title: dto.title,
          description: dto.description ?? '',
          type: dto.type ?? 'task',
          status_id: status.id,
          priority: dto.priority ?? 'sedang',
          labels: dto.labels ?? [],
          points: dto.points ?? undefined,
          due_date: dto.due ? day(dto.due) : undefined,
          rank: await this.bottomRank(project.id, status.id),
          assignee_id: assignee ?? undefined,
          reporter_id: user.userId,
          epic_id: epicId ?? undefined,
          sprint_id: sprintId ?? undefined,
          parent_id: parentId ?? undefined,
          agent_note: (dto.agentNote as unknown as Prisma.InputJsonValue) ?? undefined,
          dev: (dto.dev as Prisma.InputJsonValue) ?? undefined,
          checklist: { create: (dto.checklist ?? []).map((c, i) => ({ text: c.text, done: !!c.done, position: i })) },
          watchers: { create: [{ user_id: user.userId }] },
          ...(extra.requestId ? { request: { connect: { id: extra.requestId } } } : {}),
        },
      });
    });
    if (assignee) {
      await this.notifications.notify({
        recipientIds: [assignee], actorId: user.userId, kind: 'assign', text: 'menugaskan tiket ke Anda', target: `${ticket.key} ${ticket.title}`,
        href: this.href(ticket, project), project: project.slug, ticketKey: ticket.key,
      });
    }
    return this.detail(ticket.id);
  }

  async update(user: JwtPayload, key: string, dto: UpdateTicketDto) {
    const t = await this.findTicket(user, key);
    const pid = t.project.id;
    const status = dto.status !== undefined ? await this.statusId(pid, dto.status) : undefined;
    const assignee = await this.assigneeId(pid, dto.assigneeId);
    const data: Prisma.TicketUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      priority: dto.priority,
      labels: dto.labels,
      points: dto.points,
      due_date: dto.due === undefined ? undefined : dto.due === null ? null : day(dto.due),
      assignee_id: assignee,
      epic_id: await this.epicId(pid, dto.epicId),
      sprint_id: await this.sprintFor(pid, dto.inSprint, dto.sprintId),
      parent_id: await this.parentId(pid, t.id, dto.parentKey),
      agent_note: dto.agentNote === undefined ? undefined : dto.agentNote === null ? Prisma.DbNull : (dto.agentNote as unknown as Prisma.InputJsonValue),
      dev: dto.dev === undefined ? undefined : dto.dev === null ? Prisma.DbNull : (dto.dev as Prisma.InputJsonValue),
    };
    if (status && status.id !== t.status_id) {
      data.status_id = status.id;
      data.rank = await this.bottomRank(pid, status.id);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({ where: { id: t.id }, data });
      if (dto.checklist) {
        await tx.checklistItem.deleteMany({ where: { ticket_id: t.id } });
        await tx.checklistItem.createMany({ data: dto.checklist.map((c, i) => ({ ticket_id: t.id, text: c.text, done: !!c.done, position: i })) });
      }
    });
    await this.afterChange(user, t, { assignee, status });
    return this.detail(t.id);
  }

  private async afterChange(
    user: JwtPayload,
    t: { id: number; key: string; title: string; assignee_id: number | null; reporter_id: number; status_id: number; project: ProjectLite },
    change: { assignee?: number | null; status?: { id: number; name: string; category: string } },
  ) {
    const href = this.href(t, t.project);
    if (change.assignee && change.assignee !== t.assignee_id) {
      await this.notifications.notify({
        recipientIds: [change.assignee], actorId: user.userId, kind: 'assign', text: 'menugaskan tiket ke Anda', target: `${t.key} ${t.title}`, href, project: t.project.slug, ticketKey: t.key,
      });
    }
    if (change.status && change.status.id !== t.status_id) {
      const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticket_id: t.id }, select: { user_id: true } });
      await this.notifications.notify({
        recipientIds: [t.reporter_id, t.assignee_id, ...watchers.map((w) => w.user_id)], actorId: user.userId, kind: 'status',
        text: `memindahkan tiket ke ${change.status.name}`, target: `${t.key} ${t.title}`, href, project: t.project.slug,
      });
      // Tiket dari halaman Permintaan selesai → permintaan ikut selesai.
      if (change.status.category === 'done') {
        const req = await this.prisma.workRequest.findUnique({ where: { ticket_id: t.id } });
        if (req && req.status === 'diterima') {
          await this.prisma.workRequest.update({ where: { id: req.id }, data: { status: 'selesai' } });
          await this.notifications.notify({
            recipientIds: [req.requester_id], actorId: user.userId, kind: 'status', text: 'menyelesaikan permintaan Anda', target: req.title, href: '/permintaan',
          });
        }
      }
    }
  }

  /** Geser kartu di papan: ganti status dan/atau urutan. */
  async move(user: JwtPayload, key: string, dto: MoveTicketDto) {
    const t = await this.findTicket(user, key);
    const status = await this.statusId(t.project.id, dto.status);
    let rank = dto.rank;
    if (rank === undefined && (dto.beforeKey || dto.afterKey)) {
      const neighbor = async (k?: string) =>
        k ? (await this.prisma.ticket.findFirst({ where: { key: k.toUpperCase(), project_id: t.project.id }, select: { rank: true } }))?.rank : undefined;
      const before = await neighbor(dto.beforeKey); // kartu di bawah posisi baru
      const after = await neighbor(dto.afterKey); // kartu di atas posisi baru
      if (before !== undefined && after !== undefined) rank = (before + after) / 2;
      else if (before !== undefined) rank = before - 1;
      else if (after !== undefined) rank = after + 1;
    }
    if (rank === undefined) rank = status.id === t.status_id ? t.rank : await this.bottomRank(t.project.id, status.id);
    await this.prisma.ticket.update({ where: { id: t.id }, data: { status_id: status.id, rank } });
    await this.afterChange(user, t, { status });

    const ticket = await this.detail(t.id);
    let wipExceeded = false;
    if (status.wip) {
      const count = await this.prisma.ticket.count({
        where: { status_id: status.id, deleted_at: null, OR: [{ sprint_id: null }, { sprint: { state: 'aktif' } }] },
      });
      wipExceeded = count > status.wip;
    }
    return { ticket, wipExceeded };
  }

  async bulkUpdate(user: JwtPayload, dto: BulkUpdateDto) {
    const results: string[] = [];
    // Validasi per tiket (status/penerima harus ada di proyek masing-masing).
    for (const key of dto.keys) {
      await this.update(user, key, dto.patch);
      results.push(key.toUpperCase());
    }
    return { updated: results };
  }

  async remove(user: JwtPayload, key: string) {
    const t = await this.findTicket(user, key);
    if (!isManager(user) && t.reporter_id !== user.userId && t.project.lead_id !== user.userId) {
      throw new ForbiddenException('Hanya pelapor, lead proyek, Admin, atau Owner yang bisa menghapus tiket');
    }
    await this.prisma.$transaction([
      this.prisma.ticket.updateMany({ where: { parent_id: t.id }, data: { parent_id: null } }),
      this.prisma.ticket.update({ where: { id: t.id }, data: { deleted_at: new Date() } }),
    ]);
    return { deleted: t.key };
  }

  async bulkRemove(user: JwtPayload, keys: string[]) {
    const deleted: string[] = [];
    for (const k of keys) deleted.push((await this.remove(user, k)).deleted);
    return { deleted };
  }

  // ---------- komentar ----------

  async addComment(user: JwtPayload, key: string, dto: CommentDto) {
    const t = await this.findTicket(user, key);
    const c = await this.prisma.comment.create({ data: { ticket_id: t.id, author_id: user.userId, body: dto.text } });
    await this.prisma.ticket.update({ where: { id: t.id }, data: { updated_at: new Date() } });
    await this.prisma.ticketWatcher.upsert({
      where: { ticket_id_user_id: { ticket_id: t.id, user_id: user.userId } },
      create: { ticket_id: t.id, user_id: user.userId },
      update: {},
    });
    const href = `${this.href(t, t.project)}#komentar-${c.id}`;
    const mentioned = await this.notifications.mentionedIds(dto.text);
    await this.notifications.notify({
      recipientIds: mentioned, actorId: user.userId, kind: 'mention', text: 'menyebut Anda di komentar', target: `${t.key} ${t.title}`, href, project: t.project.slug, ticketKey: t.key, prompt: dto.text,
    });
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticket_id: t.id }, select: { user_id: true } });
    await this.notifications.notify({
      recipientIds: [t.assignee_id, t.reporter_id, ...watchers.map((w) => w.user_id)].filter((id) => !mentioned.includes(id as number)),
      actorId: user.userId, kind: 'comment', text: 'mengomentari tiket', target: `${t.key} ${t.title}`, href, project: t.project.slug, ticketKey: t.key, prompt: dto.text,
    });
    return this.detail(t.id);
  }

  async updateComment(user: JwtPayload, key: string, id: number, dto: CommentDto) {
    const t = await this.findTicket(user, key);
    const c = await this.prisma.comment.findFirst({ where: { id, ticket_id: t.id, deleted_at: null } });
    if (!c) throw new NotFoundException('Komentar tidak ditemukan');
    if (c.author_id !== user.userId) throw new ForbiddenException('Hanya penulis yang bisa mengubah komentar');
    await this.prisma.comment.update({ where: { id }, data: { body: dto.text } });
    return this.detail(t.id);
  }

  async removeComment(user: JwtPayload, key: string, id: number) {
    const t = await this.findTicket(user, key);
    const c = await this.prisma.comment.findFirst({ where: { id, ticket_id: t.id, deleted_at: null } });
    if (!c) throw new NotFoundException('Komentar tidak ditemukan');
    if (c.author_id !== user.userId && !isManager(user)) throw new ForbiddenException('Hanya penulis atau Admin yang bisa menghapus komentar');
    await this.prisma.comment.update({ where: { id }, data: { deleted_at: new Date() } });
    return this.detail(t.id);
  }

  // ---------- checklist ----------

  async setChecklist(user: JwtPayload, key: string, items: ChecklistItemDto[]) {
    const t = await this.findTicket(user, key);
    await this.prisma.$transaction([
      this.prisma.checklistItem.deleteMany({ where: { ticket_id: t.id } }),
      this.prisma.checklistItem.createMany({ data: items.map((c, i) => ({ ticket_id: t.id, text: c.text, done: !!c.done, position: i })) }),
      this.prisma.ticket.update({ where: { id: t.id }, data: { updated_at: new Date() } }),
    ]);
    return this.detail(t.id);
  }

  // ---------- relasi ----------

  async addLink(user: JwtPayload, key: string, dto: LinkDto) {
    const t = await this.findTicket(user, key);
    const other = await this.findTicket(user, dto.key);
    if (other.id === t.id) throw new BadRequestException('Tiket tidak bisa ditautkan ke dirinya sendiri');
    const [from, to, type] =
      dto.type === 'diblokir' ? [other.id, t.id, 'memblokir'] : dto.type === 'memblokir' ? [t.id, other.id, 'memblokir'] : [Math.min(t.id, other.id), Math.max(t.id, other.id), dto.type];
    await this.prisma.ticketLink.upsert({ where: { from_id_to_id_type: { from_id: from, to_id: to, type } }, create: { from_id: from, to_id: to, type }, update: {} });
    return this.detail(t.id);
  }

  async removeLink(user: JwtPayload, key: string, dto: LinkDto) {
    const t = await this.findTicket(user, key);
    const other = await this.findTicket(user, dto.key);
    await this.prisma.ticketLink.deleteMany({
      where: { OR: [{ from_id: t.id, to_id: other.id }, { from_id: other.id, to_id: t.id }], type: dto.type === 'diblokir' ? 'memblokir' : dto.type },
    });
    return this.detail(t.id);
  }

  // ---------- lampiran & pemantau ----------

  async addAttachment(user: JwtPayload, key: string, dto: AttachmentDto) {
    const t = await this.findTicket(user, key);
    const a = await this.prisma.attachment.create({
      data: { ticket_id: t.id, name: dto.name, size: dto.size, kind: dto.kind ?? kindOf(dto.name), url: dto.url, uploader_id: user.userId },
      select: attachmentSelect,
    });
    return toAttachment(a);
  }

  async uploadAttachment(user: JwtPayload, key: string, file: UploadedDiskFile | undefined) {
    // Bila tiket tidak ada / tidak boleh diakses, file yang telanjur tersimpan dibuang lagi.
    const t = await this.findTicket(user, key).catch(async (e) => {
      await this.files.discard(file);
      throw e;
    });
    return this.files.attach(user, file, { ticket_id: t.id }, { kind: 'ticket', projectSlug: t.project.slug, ticketKey: t.key });
  }

  async removeAttachment(user: JwtPayload, key: string, id: number) {
    const t = await this.findTicket(user, key);
    const a = await this.prisma.attachment.findFirst({ where: { id, ticket_id: t.id } });
    if (!a) throw new NotFoundException('Lampiran tidak ditemukan');
    if (a.uploader_id !== user.userId && !isManager(user)) throw new ForbiddenException('Hanya pengunggah atau Admin yang bisa menghapus lampiran');
    await this.prisma.attachment.delete({ where: { id } });
    await this.files.removeStored(a);
    return { deleted: true };
  }

  async watch(user: JwtPayload, key: string, on: boolean) {
    const t = await this.findTicket(user, key);
    if (on) {
      await this.prisma.ticketWatcher.upsert({
        where: { ticket_id_user_id: { ticket_id: t.id, user_id: user.userId } }, create: { ticket_id: t.id, user_id: user.userId }, update: {},
      });
    } else {
      await this.prisma.ticketWatcher.deleteMany({ where: { ticket_id: t.id, user_id: user.userId } });
    }
    return this.detail(t.id);
  }
}
