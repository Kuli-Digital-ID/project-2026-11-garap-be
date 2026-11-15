import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { auditInclude, toAudit } from '@common/serializers';
import { meta, paginate } from '@common/helpers/access';
import { AuditQueryDto } from './core/dto/activity.dto';

/** Satu sel CSV: diawali ' bila berawalan karakter rumus, dan diberi tanda kutip bila perlu. */
export const csvCell = (v: unknown): string => {
  let t = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Catat jejak audit. Tidak pernah menggagalkan permintaan utama. */
  async log(actorId: number | null, action: string, target: string, category: string, ip?: string) {
    try {
      await this.prisma.auditLog.create({ data: { actor_id: actorId, action, target, category, ip } });
    } catch {
      /* diabaikan */
    }
  }

  async list(q: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.actor ? { actor: { username: q.actor } } : {}),
      ...(q.search ? { OR: [{ action: { contains: q.search, mode: 'insensitive' } }, { target: { contains: q.search, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, include: auditInclude, orderBy: { created_at: 'desc' }, ...paginate(q.page, q.limit) }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows.map(toAudit), meta: meta(total, q.page, q.limit) };
  }

  /** Semua baris yang cocok (maks 10.000) sebagai CSV. Sel diawali ' bila berawalan karakter rumus agar aman dibuka di Excel. */
  async exportCsv(q: Pick<AuditQueryDto, 'category' | 'actor' | 'search'>) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.actor ? { actor: { username: q.actor } } : {}),
      ...(q.search ? { OR: [{ action: { contains: q.search, mode: 'insensitive' } }, { target: { contains: q.search, mode: 'insensitive' } }] } : {}),
    };
    const rows = await this.prisma.auditLog.findMany({ where, include: auditInclude, orderBy: { created_at: 'desc' }, take: 10000 });
    const cell = csvCell;
    const lines = [['Waktu', 'Pelaku', 'Aksi', 'Target', 'Kategori', 'IP'].join(',')];
    for (const r of rows.map(toAudit)) lines.push([r.time, r.actorId ?? '', r.action, r.target, r.category, r.ip ?? ''].map(cell).join(','));
    return '\uFEFF' + lines.join('\r\n');
  }
}
