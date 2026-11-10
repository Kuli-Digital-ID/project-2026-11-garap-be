import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { WORKFLOW_TEMPLATES } from '@common/constants/domain.constant';
import { epicInclude, projectInclude, toEpic, toProject, toSprint } from '@common/serializers';
import { isManager, projectScope } from '@common/helpers/access';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { OrganizationService } from '@modules/organization/organization.service';
import {
  CompleteSprintDto, CreateProjectDto, EpicDto, MembersDto, ProjectQueryDto, SprintInputDto, UpdateEpicDto, UpdateProjectDto, UpdateSprintDto,
  WorkflowDto, WorkflowStatusDto,
} from './core/dto/project.dto';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-') || 'proyek';

const day = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private org: OrganizationService,
  ) {}

  /** Ambil proyek yang boleh dilihat user; lempar 404 bila tidak ada/tidak boleh. */
  async findAccessible(user: JwtPayload, slug: string) {
    const p = await this.prisma.project.findFirst({ where: { slug, deleted_at: null, ...projectScope(user) } });
    if (!p) throw new NotFoundException('Proyek tidak ditemukan');
    return p;
  }

  /** Ubah pengaturan proyek: Owner/Admin atau lead proyek. */
  async assertCanManage(user: JwtPayload, project: { lead_id: number | null }) {
    if (!isManager(user) && project.lead_id !== user.userId) {
      throw new ForbiddenException('Hanya lead proyek, Admin, atau Owner yang bisa mengubah pengaturan proyek');
    }
  }

  private async load(id: number) {
    const row = await this.prisma.project.findUniqueOrThrow({ where: { id }, include: projectInclude });
    return toProject(row);
  }

  async list(user: JwtPayload, q: ProjectQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      deleted_at: null,
      ...projectScope(user),
      ...(q.status ? { status: q.status } : {}),
      ...(q.division ? { division: { slug: q.division } } : {}),
      ...(q.mine === 'true' ? { members: { some: { user_id: user.userId } } } : {}),
      ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { key: { contains: q.search, mode: 'insensitive' } }, { client: { contains: q.search, mode: 'insensitive' } }] } : {}),
    };
    const rows = await this.prisma.project.findMany({ where, include: projectInclude, orderBy: { updated_at: 'desc' } });
    // Aktivitas terakhir = tiket yang terakhir diubah (untuk "proyek terbaru/teraktif" di sidebar).
    const activity = await this.prisma.ticket.groupBy({
      by: ['project_id'],
      where: { project_id: { in: rows.map((r) => r.id) } },
      _max: { updated_at: true },
    });
    const last = new Map(activity.map((a) => [a.project_id, a._max.updated_at]));
    return rows.map((r) => ({ ...toProject(r), lastActivity: (last.get(r.id) ?? r.updated_at)?.toISOString() }));
  }

  async get(user: JwtPayload, slug: string) {
    const p = await this.findAccessible(user, slug);
    return this.load(p.id);
  }

  private workflowRows(list: { code: string; name: string; category: string; color: string; wip?: number }[]) {
    const codes = list.map((s) => s.code);
    if (new Set(codes).size !== codes.length) throw new BadRequestException('Kode status di alur kerja tidak boleh kembar');
    if (!list.some((s) => s.category === 'done')) throw new BadRequestException('Alur kerja wajib punya minimal satu status berkategori "done"');
    return list.map((s, i) => ({ code: s.code, name: s.name, category: s.category, color: s.color, wip: s.wip ?? null, position: i }));
  }

  private fromDto(w: WorkflowStatusDto[]) {
    return w.map((s) => ({ code: s.id, name: s.name, category: s.category, color: s.color, wip: s.wip }));
  }

  async create(user: JwtPayload, dto: CreateProjectDto) {
    const template = (dto.template ?? 'software') as keyof typeof WORKFLOW_TEMPLATES;
    const workflow = this.workflowRows(dto.workflow ? this.fromDto(dto.workflow) : WORKFLOW_TEMPLATES[template]);
    const leadId = (await this.org.userId(dto.leadId, 'Lead')) ?? user.userId;
    const memberIds = new Set<number>([user.userId, leadId]);
    for (const m of dto.memberIds ?? []) memberIds.add((await this.org.userId(m))!);

    const exists = await this.prisma.project.findFirst({ where: { OR: [{ key: dto.key }, { slug: dto.slug ?? slugify(dto.name) }] } });
    if (exists) throw new ConflictException(exists.key === dto.key ? `Kunci ${dto.key} sudah dipakai` : 'Slug proyek sudah dipakai');

    const row = await this.prisma.project.create({
      data: {
        slug: dto.slug ?? slugify(dto.name),
        key: dto.key,
        name: dto.name,
        color: dto.color,
        description: dto.description ?? '',
        client: dto.client ?? '',
        template,
        status: dto.status ?? 'Perencanaan',
        start_date: dto.start ? day(dto.start) : undefined,
        target_date: dto.target ? day(dto.target) : undefined,
        lead_id: leadId,
        division_id: await this.org.divisionId(dto.division),
        members: { create: [...memberIds].map((user_id) => ({ user_id })) },
        workflow: { create: workflow },
        ...(dto.sprint
          ? { sprints: { create: { name: dto.sprint.name, goal: dto.sprint.goal ?? '', start_date: day(dto.sprint.start), end_date: day(dto.sprint.end), state: 'aktif' } } }
          : {}),
      },
    });
    await this.audit.log(user.userId, 'membuat proyek', `${row.name} (${row.key})`, 'proyek');
    return this.load(row.id);
  }

  async update(user: JwtPayload, slug: string, dto: UpdateProjectDto) {
    const p = await this.findAccessible(user, slug);
    await this.assertCanManage(user, p);
    if (dto.key && dto.key !== p.key) {
      throw new BadRequestException('Kunci proyek tidak bisa diubah setelah ada tiket (kunci tiket akan berubah)');
    }
    await this.prisma.project.update({
      where: { id: p.id },
      data: {
        name: dto.name,
        slug: dto.slug,
        color: dto.color,
        description: dto.description,
        client: dto.client,
        status: dto.status,
        start_date: dto.start ? day(dto.start) : undefined,
        target_date: dto.target ? day(dto.target) : undefined,
        lead_id: await this.org.userId(dto.leadId, 'Lead'),
        division_id: await this.org.divisionId(dto.division),
      },
    });
    await this.audit.log(user.userId, 'memperbarui proyek', p.name, 'proyek');
    return this.load(p.id);
  }

  async remove(user: JwtPayload, slug: string) {
    const p = await this.findAccessible(user, slug);
    await this.prisma.project.update({ where: { id: p.id }, data: { deleted_at: new Date(), slug: `${p.slug}-dihapus-${p.id}`, key: `${p.key}~${p.id}` } });
    await this.audit.log(user.userId, 'menghapus proyek', p.name, 'proyek');
    return { deleted: true };
  }

  // ---------- Anggota proyek ----------

  async setMembers(user: JwtPayload, slug: string, dto: MembersDto) {
    const p = await this.findAccessible(user, slug);
    await this.assertCanManage(user, p);
    const ids = new Set<number>();
    for (const m of dto.memberIds) ids.add((await this.org.userId(m))!);
    if (p.lead_id) ids.add(p.lead_id);
    await this.prisma.$transaction([
      this.prisma.projectMember.deleteMany({ where: { project_id: p.id, user_id: { notIn: [...ids] } } }),
      this.prisma.projectMember.createMany({ data: [...ids].map((user_id) => ({ project_id: p.id, user_id })), skipDuplicates: true }),
    ]);
    await this.audit.log(user.userId, 'mengubah anggota proyek', p.name, 'proyek');
    return this.load(p.id);
  }

  // ---------- Alur kerja ----------

  async setWorkflow(user: JwtPayload, slug: string, dto: WorkflowDto) {
    const p = await this.findAccessible(user, slug);
    await this.assertCanManage(user, p);
    const next = this.workflowRows(this.fromDto(dto.workflow));
    const current = await this.prisma.workflowStatus.findMany({ where: { project_id: p.id } });
    const nextCodes = new Set(next.map((s) => s.code));
    const removed = current.filter((s) => !nextCodes.has(s.code));

    await this.prisma.$transaction(async (tx) => {
      // Simpan/ubah status yang tetap ada atau baru.
      for (const s of next) {
        await tx.workflowStatus.upsert({
          where: { project_id_code: { project_id: p.id, code: s.code } },
          create: { ...s, project_id: p.id },
          update: { name: s.name, category: s.category, color: s.color, wip: s.wip, position: s.position },
        });
      }
      // Status yang dihapus: pindahkan tiketnya dulu.
      const fresh = await tx.workflowStatus.findMany({ where: { project_id: p.id } });
      const byCode = new Map(fresh.map((s) => [s.code, s]));
      for (const old of removed) {
        const targetCode = dto.remap?.[old.code] ?? next.find((s) => s.category === old.category)?.code ?? next[0].code;
        const target = byCode.get(targetCode);
        if (!target || !nextCodes.has(targetCode)) throw new BadRequestException(`Status tujuan "${targetCode}" untuk "${old.code}" tidak ada`);
        await tx.ticket.updateMany({ where: { status_id: old.id }, data: { status_id: target.id } });
        await tx.workflowStatus.delete({ where: { id: old.id } });
      }
    });
    await this.audit.log(user.userId, 'mengubah alur kerja', p.name, 'proyek');
    return this.load(p.id);
  }

  // ---------- Sprint ----------

  async sprints(user: JwtPayload, slug: string) {
    const p = await this.findAccessible(user, slug);
    const rows = await this.prisma.sprint.findMany({
      where: { project_id: p.id },
      include: { _count: { select: { tickets: { where: { deleted_at: null } } } } },
      orderBy: { start_date: 'desc' },
    });
    return rows.map((s) => ({ ...toSprint(s), ticketCount: s._count.tickets }));
  }

  async createSprint(user: JwtPayload, slug: string, dto: SprintInputDto & { state?: string }) {
    const p = await this.findAccessible(user, slug);
    const active = await this.prisma.sprint.findFirst({ where: { project_id: p.id, state: 'aktif' } });
    const s = await this.prisma.sprint.create({
      data: { project_id: p.id, name: dto.name, goal: dto.goal ?? '', start_date: day(dto.start), end_date: day(dto.end), state: active ? 'rencana' : 'aktif' },
    });
    return toSprint(s);
  }

  async updateSprint(user: JwtPayload, slug: string, id: number, dto: UpdateSprintDto) {
    const p = await this.findAccessible(user, slug);
    const s = await this.prisma.sprint.findFirst({ where: { id, project_id: p.id } });
    if (!s) throw new NotFoundException('Sprint tidak ditemukan');
    if (s.state === 'selesai') throw new BadRequestException('Sprint yang sudah selesai tidak bisa diubah');
    if (dto.state === 'aktif' && s.state !== 'aktif') {
      const active = await this.prisma.sprint.findFirst({ where: { project_id: p.id, state: 'aktif' } });
      if (active) throw new ConflictException(`Masih ada sprint aktif (${active.name}). Selesaikan dulu.`);
    }
    const row = await this.prisma.sprint.update({
      where: { id },
      data: { name: dto.name, goal: dto.goal, start_date: dto.start ? day(dto.start) : undefined, end_date: dto.end ? day(dto.end) : undefined, state: dto.state },
    });
    return toSprint(row);
  }

  /** Tutup sprint: tiket selesai diarsipkan bersama sprint, sisanya ke backlog atau sprint berikutnya. */
  async completeSprint(user: JwtPayload, slug: string, id: number, dto: CompleteSprintDto) {
    const p = await this.findAccessible(user, slug);
    const s = await this.prisma.sprint.findFirst({ where: { id, project_id: p.id } });
    if (!s) throw new NotFoundException('Sprint tidak ditemukan');
    if (s.state === 'selesai') throw new BadRequestException('Sprint ini sudah selesai');
    if (dto.carryOver === 'next' && !dto.next) throw new BadRequestException('Isi data sprint berikutnya (next)');

    const result = await this.prisma.$transaction(async (tx) => {
      const open = await tx.ticket.findMany({
        where: { sprint_id: s.id, deleted_at: null, status: { category: { not: 'done' } } },
        select: { id: true },
      });
      let nextSprint: { id: number } | null = null;
      if (dto.carryOver === 'next' && dto.next) {
        nextSprint = await tx.sprint.create({
          data: { project_id: p.id, name: dto.next.name, goal: dto.next.goal ?? '', start_date: day(dto.next.start), end_date: day(dto.next.end), state: 'aktif' },
        });
      }
      await tx.ticket.updateMany({ where: { id: { in: open.map((t) => t.id) } }, data: { sprint_id: nextSprint?.id ?? null } });
      await tx.sprint.update({ where: { id: s.id }, data: { state: 'selesai', completed_at: new Date() } });
      if (!nextSprint) {
        // Sprint "rencana" berikutnya otomatis menjadi aktif.
        const planned = await tx.sprint.findFirst({ where: { project_id: p.id, state: 'rencana' }, orderBy: { start_date: 'asc' } });
        if (planned) await tx.sprint.update({ where: { id: planned.id }, data: { state: 'aktif' } });
      }
      const done = await tx.ticket.count({ where: { sprint_id: s.id, deleted_at: null } });
      return { completed: done, carriedOver: open.length };
    });
    await this.audit.log(user.userId, 'menyelesaikan sprint', `${p.name} · ${s.name}`, 'proyek');
    return { ...result, project: await this.load(p.id) };
  }

  // ---------- Epic ----------

  async epics(user: JwtPayload, slug: string) {
    const p = await this.findAccessible(user, slug);
    const rows = await this.prisma.epic.findMany({ where: { project_id: p.id, deleted_at: null }, include: epicInclude, orderBy: { start_week: 'asc' } });
    return rows.map(toEpic);
  }

  async createEpic(user: JwtPayload, slug: string, dto: EpicDto) {
    const p = await this.findAccessible(user, slug);
    const row = await this.prisma.epic.create({
      data: {
        project_id: p.id, name: dto.name, color: dto.color, start_week: dto.start ?? 0, weeks: dto.weeks ?? 2, progress: dto.progress ?? 0,
        owner_id: await this.org.userId(dto.ownerId, 'Pemilik epic'),
      },
      include: epicInclude,
    });
    return toEpic(row);
  }

  async updateEpic(user: JwtPayload, slug: string, id: number, dto: UpdateEpicDto) {
    const p = await this.findAccessible(user, slug);
    const e = await this.prisma.epic.findFirst({ where: { id, project_id: p.id, deleted_at: null } });
    if (!e) throw new NotFoundException('Epic tidak ditemukan');
    const row = await this.prisma.epic.update({
      where: { id },
      data: { name: dto.name, color: dto.color, start_week: dto.start, weeks: dto.weeks, progress: dto.progress, owner_id: await this.org.userId(dto.ownerId, 'Pemilik epic') },
      include: epicInclude,
    });
    return toEpic(row);
  }

  async removeEpic(user: JwtPayload, slug: string, id: number) {
    const p = await this.findAccessible(user, slug);
    const e = await this.prisma.epic.findFirst({ where: { id, project_id: p.id, deleted_at: null } });
    if (!e) throw new NotFoundException('Epic tidak ditemukan');
    await this.prisma.$transaction([
      this.prisma.ticket.updateMany({ where: { epic_id: id }, data: { epic_id: null } }),
      this.prisma.epic.update({ where: { id }, data: { deleted_at: new Date() } }),
    ]);
    return { deleted: true };
  }
}
