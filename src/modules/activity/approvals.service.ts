import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { approvalInclude, runInclude, toApproval, toRun } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { projectScope } from '@common/helpers/access';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { ApprovalQueryDto, CreateApprovalDto, DecideApprovalDto, RunQueryDto } from './core/dto/activity.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async list(user: JwtPayload, q: ApprovalQueryDto) {
    const where: Prisma.ApprovalWhereInput = {
      project: projectScope(user),
      ...(q.status ? { status: q.status } : {}),
      ...(q.project ? { project: { slug: q.project } } : {}),
      ...(q.agent ? { agent: { username: q.agent } } : {}),
    };
    const rows = await this.prisma.approval.findMany({ where, include: approvalInclude, orderBy: { created_at: 'desc' } });
    return rows.map(toApproval);
  }

  /** Dipanggil oleh agent: minta persetujuan manusia sebelum tindakan berisiko. */
  async create(user: JwtPayload, dto: CreateApprovalDto) {
    if (user.kind !== 'agent') throw new BadRequestException('Hanya agent yang mengajukan persetujuan');
    const project = await this.prisma.project.findFirst({ where: { slug: dto.project, deleted_at: null } });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    const row = await this.prisma.approval.create({
      data: { agent_id: user.userId, project_id: project.id, kind: dto.kind, title: dto.title, detail: dto.detail ?? '', preview: dto.preview, risk: dto.risk ?? 'rendah' },
      include: approvalInclude,
    });
    const supervisor = await this.prisma.agentProfile.findUnique({ where: { user_id: user.userId }, select: { supervisor_id: true } });
    await this.notifications.notify({
      recipientIds: [supervisor?.supervisor_id, project.lead_id],
      actorId: user.userId,
      kind: 'approval',
      text: 'meminta persetujuan',
      target: dto.title,
      href: '/persetujuan',
      project: project.slug,
    });
    await this.audit.log(user.userId, 'mengajukan persetujuan', dto.title, 'agent', 'agent-runtime');
    return toApproval(row);
  }

  async decide(user: JwtPayload, id: number, dto: DecideApprovalDto) {
    const current = await this.prisma.approval.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Persetujuan tidak ditemukan');
    if (current.status !== 'menunggu') throw new BadRequestException('Persetujuan ini sudah diputuskan');
    const row = await this.prisma.approval.update({
      where: { id },
      data: { status: dto.decision, decided_by: user.userId, decided_at: new Date() },
      include: approvalInclude,
    });
    // Persetujuan publikasi → postingan masuk jadwal (atau kembali ke draf).
    if (current.content_post_id) {
      await this.prisma.contentPost.updateMany({
        where: { id: current.content_post_id, status: 'menunggu' },
        data: dto.decision === 'disetujui' ? { status: 'terjadwal', approved_by: user.userId, approved_at: new Date() } : { status: 'draf' },
      });
    }
    await this.notifications.notify({
      recipientIds: [current.agent_id],
      actorId: user.userId,
      kind: 'approval',
      text: dto.decision === 'disetujui' ? 'menyetujui permintaan Anda' : 'menolak permintaan Anda',
      target: current.title,
      href: '/persetujuan',
      project: row.project.slug,
    });
    await this.audit.log(user.userId, dto.decision === 'disetujui' ? 'menyetujui' : 'menolak', current.title, 'agent');
    return toApproval(row);
  }

  async runs(user: JwtPayload, q: RunQueryDto) {
    const rows = await this.prisma.agentRun.findMany({
      where: {
        project: projectScope(user),
        ...(q.agent ? { agent: { username: q.agent } } : {}),
        ...(q.project ? { project: { slug: q.project } } : {}),
        ...(q.status ? { status: q.status } : {}),
      },
      include: runInclude,
      orderBy: { started_at: 'desc' },
      take: q.limit ?? 50,
    });
    return rows.map(toRun);
  }

  async run(code: string) {
    const row = await this.prisma.agentRun.findUnique({ where: { code }, include: runInclude });
    if (!row) throw new NotFoundException('Run tidak ditemukan');
    return toRun(row);
  }
}
