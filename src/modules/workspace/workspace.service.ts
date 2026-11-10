import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { isManager } from '@common/helpers/access';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { UpdateWorkspaceDto } from './core/dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async row() {
    return this.prisma.workspace.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  }

  /** Nama & logo untuk sidebar dan halaman masuk (tanpa login). */
  async branding() {
    const w = await this.row();
    return { name: w.name, logo: w.logo };
  }

  async get() {
    const w = await this.row();
    return { name: w.name, logo: w.logo, timezone: w.timezone, language: w.language, updatedAt: w.updated_at.toISOString() };
  }

  /** Pengaturan Umum hanya untuk Owner & Admin. */
  async update(user: JwtPayload, dto: UpdateWorkspaceDto) {
    if (!isManager(user)) throw new ForbiddenException('Pengaturan umum hanya untuk Owner dan Admin');
    await this.row();
    await this.prisma.workspace.update({
      where: { id: 1 },
      data: { name: dto.name, logo: dto.logo, timezone: dto.timezone, language: dto.language, updated_by: user.userId },
    });
    const what = [dto.logo !== undefined && (dto.logo ? 'logo' : 'hapus logo'), dto.name && 'nama', dto.timezone && 'zona waktu', dto.language && 'bahasa'].filter(Boolean).join(', ');
    await this.audit.log(user.userId, 'mengubah pengaturan umum', what || '-', 'keamanan');
    return this.get();
  }
}
