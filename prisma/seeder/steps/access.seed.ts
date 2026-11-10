import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_POSITION_PERMISSIONS,
  PERMISSIONS,
  POSITION_NAMES,
  PositionName,
} from '../../../src/common/constants/permissions.constant';

const DESCRIPTIONS: Record<PositionName, string> = {
  Owner: 'Pemilik workspace. Semua izin, termasuk mengatur hak akses.',
  Admin: 'Mengelola anggota, divisi, proyek, dan agent.',
  Anggota: 'Bekerja di proyek: membuat & memperbarui tiket, dokumen, dan permintaan.',
  Tamu: 'Akses baca ke proyek tempat ia diundang, bisa berkomentar.',
  Agent: 'Agent AI. Bekerja di tiket & dokumen; tindakan berisiko lewat persetujuan.',
};

export const seedAccess = async (prisma: PrismaClient) => {
  console.log('🔐 Posisi & izin...');
  const all = Object.values(PERMISSIONS).flatMap((group) => Object.values(group)) as string[];
  const permissions = await Promise.all(
    all.map((name) => {
      const [action, ...rest] = name.split('_');
      return prisma.permission.create({
        data: { name, action, resource: rest.join('_'), description: name.replace(/_/g, ' ').toLowerCase() },
      });
    }),
  );
  const permId = new Map(permissions.map((p) => [p.name, p.id]));

  const positions = new Map<PositionName, number>();
  for (const name of POSITION_NAMES) {
    const pos = await prisma.position.create({ data: { name, description: DESCRIPTIONS[name] } });
    positions.set(name, pos.id);
    const names = name === 'Owner' ? all : DEFAULT_POSITION_PERMISSIONS[name];
    await prisma.positionPermission.createMany({
      data: [...new Set(names)].map((n) => ({ position_id: pos.id, permission_id: permId.get(n)! })),
    });
  }
  console.log(`   ${permissions.length} izin, ${positions.size} posisi`);
  return positions;
};
