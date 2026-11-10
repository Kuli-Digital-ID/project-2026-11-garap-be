import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { agentInclude, divisionInclude, memberInclude, toAgent, toDivision, toMember } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { AiProvidersService } from '@modules/ai/ai-providers.service';
import {
  CreateAgentDto, CreateDivisionDto, CreateMemberDto, MemberQueryDto, UpdateAgentDto, UpdateDivisionDto, UpdateMemberDto, UpdateMyProfileDto,
} from './core/dto/organization.dto';

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ai: AiProvidersService,
  ) {}

  // ---------- helper id ----------

  async userId(username: string | undefined | null, what = 'Anggota'): Promise<number | null | undefined> {
    if (username === undefined) return undefined;
    if (username === null || username === '') return null;
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new BadRequestException(`${what} "${username}" tidak ditemukan`);
    return u.id;
  }

  async divisionId(slug: string | undefined | null): Promise<number | null | undefined> {
    if (slug === undefined) return undefined;
    if (slug === null || slug === '') return null;
    const d = await this.prisma.division.findFirst({ where: { slug, deleted_at: null }, select: { id: true } });
    if (!d) throw new BadRequestException(`Divisi "${slug}" tidak ditemukan`);
    return d.id;
  }

  async positionId(name: string) {
    const p = await this.prisma.position.findUnique({ where: { name }, select: { id: true } });
    if (!p) throw new BadRequestException(`Posisi "${name}" tidak ditemukan`);
    return p.id;
  }

  // ---------- Divisi ----------

  async divisions() {
    const rows = await this.prisma.division.findMany({ where: { deleted_at: null }, include: divisionInclude, orderBy: { id: 'asc' } });
    return rows.map(toDivision);
  }

  async division(slug: string) {
    const row = await this.prisma.division.findFirst({ where: { slug, deleted_at: null }, include: divisionInclude });
    if (!row) throw new NotFoundException('Divisi tidak ditemukan');
    return toDivision(row);
  }

  async createDivision(actor: JwtPayload, dto: CreateDivisionDto) {
    const row = await this.prisma.division.create({
      data: {
        slug: dto.slug, name: dto.name, color: dto.color, description: dto.description ?? '',
        request_kinds: dto.requestKinds ?? [], lead_id: await this.userId(dto.leadId, 'Ketua divisi'),
      },
      include: divisionInclude,
    });
    await this.audit.log(actor.userId, 'membuat divisi', dto.name, 'akses');
    return toDivision(row);
  }

  async updateDivision(actor: JwtPayload, slug: string, dto: UpdateDivisionDto) {
    const current = await this.prisma.division.findFirst({ where: { slug, deleted_at: null } });
    if (!current) throw new NotFoundException('Divisi tidak ditemukan');
    const row = await this.prisma.division.update({
      where: { id: current.id },
      data: {
        slug: dto.slug, name: dto.name, color: dto.color, description: dto.description,
        request_kinds: dto.requestKinds, lead_id: await this.userId(dto.leadId, 'Ketua divisi'),
      },
      include: divisionInclude,
    });
    await this.audit.log(actor.userId, 'memperbarui divisi', row.name, 'akses');
    return toDivision(row);
  }

  async removeDivision(actor: JwtPayload, slug: string) {
    const current = await this.prisma.division.findFirst({ where: { slug, deleted_at: null }, include: divisionInclude });
    if (!current) throw new NotFoundException('Divisi tidak ditemukan');
    if (current._count.members || current._count.projects) {
      throw new ConflictException('Divisi masih punya anggota atau proyek. Pindahkan dulu.');
    }
    await this.prisma.division.update({ where: { id: current.id }, data: { deleted_at: new Date(), slug: `${slug}-dihapus-${current.id}` } });
    await this.audit.log(actor.userId, 'menghapus divisi', current.name, 'akses');
    return { deleted: true };
  }

  // ---------- Anggota ----------

  async members(q: MemberQueryDto) {
    const where: Prisma.UserWhereInput = {
      deleted_at: null,
      ...(q.includeInactive ? {} : { is_active: true }),
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.division ? { division: { slug: q.division } } : {}),
      ...(q.access ? { position: { name: q.access } } : {}),
      ...(q.search
        ? {
            OR: ['display_name', 'first_name', 'last_name', 'username', 'email', 'role', 'team'].map((f) => ({
              [f]: { contains: q.search, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const rows = await this.prisma.user.findMany({ where, include: memberInclude, orderBy: [{ kind: 'desc' }, { id: 'asc' }] });
    return rows.map(toMember);
  }

  async member(username: string) {
    const row = await this.prisma.user.findFirst({ where: { username, deleted_at: null }, include: agentInclude });
    if (!row) throw new NotFoundException('Anggota tidak ditemukan');
    return row.kind === 'agent' ? toAgent(row) : toMember(row);
  }

  private guardOwner(actor: JwtPayload, targetAccess?: string) {
    if (targetAccess === 'Owner' && actor.positionName !== 'Owner') {
      throw new ForbiddenException('Hanya Owner yang bisa memberi atau mengubah akses Owner');
    }
  }

  async createMember(actor: JwtPayload, dto: CreateMemberDto) {
    this.guardOwner(actor, dto.access);
    const [first, ...rest] = dto.fullName.trim().split(/\s+/);
    const row = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email.toLowerCase(),
        first_name: first,
        last_name: rest.join(' '),
        display_name: dto.name ?? first,
        initials: initialsOf(dto.fullName),
        color: dto.color,
        kind: 'human',
        role: dto.role ?? '',
        team: dto.team ?? '',
        division_id: await this.divisionId(dto.division),
        position_id: await this.positionId(dto.access ?? 'Anggota'),
      },
      include: memberInclude,
    });
    await this.audit.log(actor.userId, 'mendaftarkan anggota', `${dto.fullName} (${dto.email})`, 'akses');
    return toMember(row);
  }

  async updateMember(actor: JwtPayload, username: string, dto: UpdateMemberDto) {
    const current = await this.prisma.user.findFirst({ where: { username, deleted_at: null }, include: memberInclude });
    if (!current) throw new NotFoundException('Anggota tidak ditemukan');
    this.guardOwner(actor, dto.access);
    if (current.position.name === 'Owner') this.guardOwner(actor, 'Owner');
    if (current.id === actor.userId && (dto.isActive === false || (dto.access && dto.access !== current.position.name))) {
      throw new BadRequestException('Anda tidak bisa menonaktifkan atau mengubah akses akun sendiri');
    }
    const [first, ...rest] = (dto.fullName ?? '').trim().split(/\s+/);
    const row = await this.prisma.user.update({
      where: { id: current.id },
      data: {
        username: dto.username,
        email: dto.email?.toLowerCase(),
        ...(dto.fullName ? { first_name: first, last_name: rest.join(' '), initials: initialsOf(dto.fullName) } : {}),
        display_name: dto.name,
        role: dto.role,
        team: dto.team,
        color: dto.color,
        status: dto.status,
        is_active: dto.isActive,
        division_id: await this.divisionId(dto.division),
        position_id: dto.access ? await this.positionId(dto.access) : undefined,
        // Email berubah → ikatan ke akun Keycloak lama dilepas.
        ...(dto.email && dto.email.toLowerCase() !== current.email ? { sso_subject: null } : {}),
      },
      include: memberInclude,
    });
    const changes = Object.keys(dto).join(', ');
    await this.audit.log(actor.userId, 'memperbarui anggota', `${row.display_name} (${changes})`, 'akses');
    return toMember(row);
  }

  async updateMe(actor: JwtPayload, dto: UpdateMyProfileDto) {
    const row = await this.prisma.user.update({
      where: { id: actor.userId },
      data: { display_name: dto.name, color: dto.color, status: dto.status },
      include: memberInclude,
    });
    return toMember(row);
  }

  async removeMember(actor: JwtPayload, username: string) {
    const current = await this.prisma.user.findFirst({ where: { username, deleted_at: null }, include: memberInclude });
    if (!current) throw new NotFoundException('Anggota tidak ditemukan');
    if (current.id === actor.userId) throw new BadRequestException('Anda tidak bisa menghapus akun sendiri');
    if (current.position.name === 'Owner') this.guardOwner(actor, 'Owner');
    // Soft delete: riwayat tiket & komentar tetap utuh.
    await this.prisma.user.update({ where: { id: current.id }, data: { is_active: false, deleted_at: new Date(), sso_subject: null } });
    await this.prisma.projectMember.deleteMany({ where: { user_id: current.id } });
    await this.audit.log(actor.userId, 'menghapus anggota', current.display_name, 'akses');
    return { deleted: true };
  }

  // ---------- Agent ----------

  async agents() {
    const rows = await this.prisma.user.findMany({ where: { kind: 'agent', deleted_at: null }, include: agentInclude, orderBy: { id: 'asc' } });
    return rows.map(toAgent);
  }

  async createAgent(actor: JwtPayload, dto: CreateAgentDto) {
    await this.ai.assertUsable(dto.provider, dto.modelId);
    const row = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: `${dto.username}@agent.garap.local`,
        first_name: dto.name,
        display_name: dto.name,
        initials: initialsOf(dto.name),
        kind: 'agent',
        role: dto.role,
        team: 'Agent',
        status: 'idle',
        division_id: await this.divisionId(dto.division),
        position_id: await this.positionId('Agent'),
        agent_profile: {
          create: {
            provider: dto.provider,
            model_id: dto.modelId,
            model: dto.model ?? dto.modelId,
            description: dto.description ?? '',
            skills: dto.skills ?? [],
            budget: dto.budget ?? 0,
            usage: Array(30).fill(0),
            supervisor_id: (await this.userId(dto.supervisorId, 'Penanggung jawab'))!,
          },
        },
      },
      include: agentInclude,
    });
    await this.audit.log(actor.userId, 'membuat agent', dto.name, 'agent');
    return toAgent(row);
  }

  async updateAgent(actor: JwtPayload, username: string, dto: UpdateAgentDto) {
    const current = await this.prisma.user.findFirst({ where: { username, kind: 'agent', deleted_at: null } });
    if (!current) throw new NotFoundException('Agent tidak ditemukan');
    if (dto.provider || dto.modelId) {
      if (!dto.provider || !dto.modelId) throw new BadRequestException('Isi provider dan modelId bersamaan');
      await this.ai.assertUsable(dto.provider, dto.modelId);
    }
    const row = await this.prisma.user.update({
      where: { id: current.id },
      data: {
        ...(dto.name ? { display_name: dto.name, first_name: dto.name, initials: initialsOf(dto.name) } : {}),
        role: dto.role,
        status: dto.status,
        is_active: dto.isActive,
        agent_profile: {
          update: {
            provider: dto.provider,
            model_id: dto.modelId,
            model: dto.model ?? dto.modelId,
            description: dto.description,
            skills: dto.skills,
            budget: dto.budget,
            current_task: dto.currentTask,
            tools: dto.tools as Prisma.InputJsonValue | undefined,
            learnings: dto.learnings as Prisma.InputJsonValue | undefined,
            supervisor_id: await this.userId(dto.supervisorId, 'Penanggung jawab'),
          },
        },
      },
      include: agentInclude,
    });
    await this.audit.log(actor.userId, 'memperbarui agent', row.display_name, 'agent');
    return toAgent(row);
  }

  // ---------- Posisi & izin ----------

  async positions() {
    const rows = await this.prisma.position.findMany({
      where: { deleted_at: null },
      include: { position_permissions: { include: { permission: true } }, _count: { select: { users: { where: { deleted_at: null } } } } },
      orderBy: { id: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      memberCount: p._count.users,
      permissions: p.position_permissions.map((pp) => pp.permission.name).sort(),
    }));
  }

  async permissions() {
    return this.prisma.permission.findMany({
      where: { deleted_at: null },
      select: { name: true, resource: true, action: true, description: true },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async setPositionPermissions(actor: JwtPayload, id: number, names: string[]) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) throw new NotFoundException('Posisi tidak ditemukan');
    if (position.name === 'Owner') throw new BadRequestException('Izin Owner tidak bisa dikurangi');
    const perms = await this.prisma.permission.findMany({ where: { name: { in: names } } });
    const unknown = names.filter((n) => !perms.some((p) => p.name === n));
    if (unknown.length) throw new BadRequestException(`Izin tidak dikenal: ${unknown.join(', ')}`);
    await this.prisma.$transaction([
      this.prisma.positionPermission.deleteMany({ where: { position_id: id } }),
      this.prisma.positionPermission.createMany({ data: perms.map((p) => ({ position_id: id, permission_id: p.id })) }),
    ]);
    await this.audit.log(actor.userId, 'mengubah izin posisi', position.name, 'akses');
    return (await this.positions()).find((p) => p.id === id);
  }
}
