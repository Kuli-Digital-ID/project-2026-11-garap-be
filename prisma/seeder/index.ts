/**
 * Mengosongkan SEMUA data lalu menyisakan yang dibutuhkan untuk masuk pertama kali:
 * posisi + izin, workspace, dan satu akun Owner (bhagaskuro).
 *
 *   npm run prisma:seed
 *   OWNER_PASSWORD='rahasia123' npm run prisma:seed      (tanpa ini, password acak dicetak sekali dan wajib diganti saat masuk)
 *
 * Isi akun Owner bisa diganti lewat OWNER_EMAIL, OWNER_NAME, OWNER_USERNAME, OWNER_PASSWORD.
 * Di produksi wajib SEED_CONFIRM=yes. Data demo: npm run prisma:seed:demo.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PasswordUtil } from '../../src/common/utils/password.util';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../src/modules/auth/core/dto/login.dto';
import { seedAccess } from './steps/access.seed';
import { truncateAll } from './steps/truncate';

const OWNER = {
  email: 'bhagaskuro@gmail.com',
  fullName: 'Bhagas Kuro',
  username: 'bhagaskuro',
  role: 'Direktur',
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });

/** 14 karakter: huruf + angka (memenuhi aturan password), tanpa karakter yang mudah tertukar. */
const randomPassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(14);
  const pw = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `${pw.slice(0, 12)}a7`;
};

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_CONFIRM !== 'yes') {
    throw new Error('Seeder ini MENGHAPUS semua data. Di produksi jalankan dengan SEED_CONFIRM=yes.');
  }
  const email = (process.env.OWNER_EMAIL?.trim() || OWNER.email).toLowerCase();
  const fullName = process.env.OWNER_NAME?.trim() || OWNER.fullName;
  const username = (process.env.OWNER_USERNAME?.trim() || OWNER.username).toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const given = process.env.OWNER_PASSWORD;
  if (given && !PASSWORD_RULE.test(given)) throw new Error(`OWNER_PASSWORD: ${PASSWORD_MESSAGE}`);
  const password = given || randomPassword();

  console.log('🗑️  Mengosongkan semua data...');
  await truncateAll(prisma);

  const positions = await seedAccess(prisma);
  await prisma.workspace.create({ data: { id: 1, name: process.env.WORKSPACE_NAME ?? 'Kuli Digital' } });

  const [first, ...rest] = fullName.split(/\s+/);
  await prisma.user.create({
    data: {
      username,
      email,
      password: await PasswordUtil.hash(password),
      // Password acak (tidak dipilih sendiri) wajib diganti saat masuk pertama.
      must_change_password: !given,
      first_name: first,
      last_name: rest.join(' '),
      display_name: first,
      initials: fullName.split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
      role: OWNER.role,
      kind: 'human',
      position_id: positions.get('Owner')!,
    },
  });

  console.log(`\n✨ Selesai. Database kosong, hanya akun Owner:\n   email   : ${email}\n   username: ${username}`);
  if (given) console.log('   password: sesuai OWNER_PASSWORD');
  else console.log(`   password: ${password}   (dicetak sekali; wajib diganti saat masuk pertama)`);
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
