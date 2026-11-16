import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';

export const isManager = (u: JwtPayload) => u.positionName === 'Owner' || u.positionName === 'Admin';

export const can = (u: JwtPayload, permission: string) => u.permissions.includes(permission);

/** Owner & Admin melihat semua proyek; posisi lain (Anggota, Tamu, Agent) hanya proyek tempat ia menjadi anggota. */
export const projectScope = (u: JwtPayload): Prisma.ProjectWhereInput =>
  isManager(u) ? {} : { members: { some: { user_id: u.userId } } };

export const assertManagerOr = (u: JwtPayload, ok: boolean, message = 'Anda tidak punya akses untuk tindakan ini') => {
  if (!ok && !isManager(u)) throw new ForbiddenException(message);
};

export const paginate = (page = 1, limit = 50) => ({ skip: (page - 1) * limit, take: limit });

export const meta = (total: number, page = 1, limit = 50) => ({ total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
