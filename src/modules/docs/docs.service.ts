import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { isManager, projectScope } from '@common/helpers/access';
import { docInclude, toDoc } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { NotificationsService } from '@modules/activity/notifications.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { OrganizationService } from '@modules/organization/organization.service';
import { CreateDocDto, DocQueryDto, ReviewDocDto, UpdateDocDto } from './core/dto/doc.dto';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60) || 'dokumen';

@Injectable()
export class DocsService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private org: OrganizationService,
    private notifications: NotificationsService,
  ) {}

  private async find(user: JwtPayload, slug: string) {
    const d = await this.prisma.doc.findFirst({ where: { slug, deleted_at: null, project: { deleted_at: null, ...projectScope(user) } }, include: docInclude });
    if (!d) throw new NotFoundException('Dokumen tidak ditemukan');
    return d;
  }

  async list(user: JwtPayload, q: DocQueryDto) {
    const where: Prisma.DocWhereInput = {
      deleted_at: null,
      project: { deleted_at: null, ...projectScope(user), ...(q.project ? { slug: q.project } : {}) },
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
    };
    // Daftar tidak menyertakan isi bagian agar ringan.
    const rows = await this.prisma.doc.findMany({ where, include: docInclude, orderBy: { updated_at: 'desc' } });
    return rows.map((d) => ({ ...toDoc(d), sections: undefined, sectionCount: Array.isArray(d.sections) ? d.sections.length : 0 }));
  }

  async get(user: JwtPayload, slug: string) {
    return toDoc(await this.find(user, slug));
  }

  async create(user: JwtPayload, dto: CreateDocDto) {
    const project = await this.projects.findAccessible(user, dto.project);
    const base = `${project.slug}-${slugify(dto.title)}`;
    const taken = await this.prisma.doc.count({ where: { slug: { startsWith: base } } });
    const row = await this.prisma.doc.create({
      data: {
        slug: taken ? `${base}-${taken + 1}` : base,
        project_id: project.id,
        title: dto.title,
        kind: dto.kind,
        version: dto.version ?? '0.1',
        pages: dto.pages ?? 1,
        sections: (dto.sections ?? []) as unknown as Prisma.InputJsonValue,
        author_id: user.userId,
        reviewer_id: await this.org.userId(dto.reviewerId, 'Reviewer'),
      },
      include: docInclude,
    });
    return toDoc(row);
  }

  async update(user: JwtPayload, slug: string, dto: UpdateDocDto) {
    const d = await this.find(user, slug);
    if (d.status === 'Disetujui' && !isManager(user)) throw new BadRequestException('Dokumen yang sudah disetujui dikunci. Buat versi baru.');
    const row = await this.prisma.doc.update({
      where: { id: d.id },
      data: {
        title: dto.title,
        kind: dto.kind,
        version: dto.version,
        pages: dto.pages,
        sections: dto.sections as unknown as Prisma.InputJsonValue | undefined,
        reviewer_id: await this.org.userId(dto.reviewerId, 'Reviewer'),
      },
      include: docInclude,
    });
    return toDoc(row);
  }

  async review(user: JwtPayload, slug: string, dto: ReviewDocDto) {
    const d = await this.find(user, slug);
    if (dto.status === 'Disetujui' && d.reviewer_id !== user.userId && !isManager(user)) {
      throw new ForbiddenException('Hanya reviewer dokumen atau Admin yang bisa menyetujui');
    }
    const row = await this.prisma.doc.update({ where: { id: d.id }, data: { status: dto.status }, include: docInclude });
    const recipients = dto.status === 'Direview' ? [d.reviewer_id] : [d.author_id];
    await this.notifications.notify({
      recipientIds: recipients, actorId: user.userId, kind: 'status',
      text: dto.status === 'Direview' ? 'meminta Anda mereview dokumen' : dto.status === 'Disetujui' ? 'menyetujui dokumen Anda' : 'mengembalikan dokumen ke draf',
      target: d.title, href: `/dokumen/${d.slug}`, project: d.project.slug,
    });
    return toDoc(row);
  }

  async remove(user: JwtPayload, slug: string) {
    const d = await this.find(user, slug);
    if (d.author_id !== user.userId && !isManager(user)) throw new ForbiddenException('Hanya penulis atau Admin yang bisa menghapus dokumen');
    await this.prisma.doc.update({ where: { id: d.id }, data: { deleted_at: new Date(), slug: `${d.slug}-dihapus-${d.id}` } });
    return { deleted: true };
  }
}
