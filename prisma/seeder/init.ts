/**
 * Menyiapkan database kosong untuk dipakai sungguhan (tanpa data demo, tanpa menghapus apa pun):
 * posisi + izin bawaan, baris workspace, dan akun Owner pertama.
 *
 *   OWNER_EMAIL=nama@kantor.id OWNER_NAME="Nama Lengkap" OWNER_PASSWORD='rahasia123' npm run prisma:init
 *
 * Aman dijalankan berulang: izin baru ditambahkan, akun Owner hanya dibuat bila belum ada satu pun.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DEFAULT_POSITION_PERMISSIONS, PERMISSIONS, POSITION_NAMES } from '../../src/common/constants/permissions.constant';
import { PasswordUtil } from '../../src/common/utils/password.util';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../src/modules/auth/core/dto/login.dto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });

async function main() {
  const all = Object.values(PERMISSIONS).flatMap((group) => Object.values(group)) as string[];
  for (const name of all) {
    const [action, ...rest] = name.split('_');
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, action, resource: rest.join('_'), description: name.replace(/_/g, ' ').toLowerCase() },
    });
  }
  const permId = new Map((await prisma.permission.findMany()).map((p) => [p.name, p.id]));

  for (const name of POSITION_NAMES) {
    const existing = await prisma.position.findUnique({ where: { name } });
    const pos = existing ?? (await prisma.position.create({ data: { name, description: '' } }));
    // Posisi yang sudah ada tidak diubah izinnya (mungkin sudah disesuaikan), kecuali Owner yang selalu lengkap.
    if (!existing || name === 'Owner') {
      const names = name === 'Owner' ? all : DEFAULT_POSITION_PERMISSIONS[name];
      await prisma.positionPermission.createMany({
        data: [...new Set(names)].map((n) => ({ position_id: pos.id, permission_id: permId.get(n)! })),
        skipDuplicates: true,
      });
    }
  }
  await prisma.workspace.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: process.env.WORKSPACE_NAME ?? 'Kuli Digital' } });
  console.log(`✔ ${all.length} izin, ${POSITION_NAMES.length} posisi, workspace siap`);

  const owner = await prisma.user.findFirst({ where: { position: { name: 'Owner' }, deleted_at: null }, select: { email: true } });
  if (owner) {
    console.log(`✔ Owner sudah ada (${owner.email}); tidak membuat akun baru`);
    return;
  }
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const fullName = process.env.OWNER_NAME?.trim();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !fullName || !password) {
    throw new Error('Belum ada Owner. Isi OWNER_EMAIL, OWNER_NAME, dan OWNER_PASSWORD lalu jalankan lagi.');
  }
  if (!PASSWORD_RULE.test(password)) throw new Error(`OWNER_PASSWORD: ${PASSWORD_MESSAGE}`);
  const [first, ...rest] = fullName.split(/\s+/);
  const username = (process.env.OWNER_USERNAME ?? first).toLowerCase().replace(/[^a-z0-9._-]/g, '');
  await prisma.user.create({
    data: {
      username,
      email,
      password: await PasswordUtil.hash(password),
      first_name: first,
      last_name: rest.join(' '),
      display_name: first,
      initials: fullName.split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
      kind: 'human',
      position: { connect: { name: 'Owner' } },
    },
  });
  console.log(`✔ Akun Owner dibuat: ${email} (username "${username}")`);
}

main()
  .catch((e) => {
    console.error(`❌ ${e.message ?? e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
