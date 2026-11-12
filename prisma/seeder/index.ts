import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAccess } from './steps/access.seed';
import { seedOrganization } from './steps/organization.seed';
import { seedProjects } from './steps/projects.seed';
import { seedTickets } from './steps/tickets.seed';
import { seedActivity } from './steps/activity.seed';
import { seedContent } from './steps/content.seed';
import { seedEmployees } from './steps/employees.seed';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Garap...\n');

  console.log('🗑️  Mengosongkan data lama...');
  // Kosongkan semua tabel aplikasi dan reset nomor id (riwayat migrasi tidak disentuh).
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }

  await prisma.workspace.create({ data: { id: 1, name: 'Kuli Digital' } });
  const positions = await seedAccess(prisma);
  const { users, divisions, devPassword } = await seedOrganization(prisma, positions);
  await seedEmployees(prisma, users);
  const projects = await seedProjects(prisma, users, divisions);
  const tickets = await seedTickets(prisma, users, projects);
  const posts = await seedContent(prisma, users, projects, tickets);
  await seedActivity(prisma, users, divisions, projects, tickets, posts);

  console.log('\n✨ Selesai.');
  const counts = {
    users: await prisma.user.count(),
    divisions: await prisma.division.count(),
    projects: await prisma.project.count(),
    tickets: await prisma.ticket.count(),
    requests: await prisma.workRequest.count(),
    docs: await prisma.doc.count(),
  };
  console.table(counts);
  if (devPassword) {
    const owner = await prisma.user.findFirst({ where: { position: { name: 'Owner' } }, select: { email: true } });
    console.log(`🔑 Login demo: ${owner?.email ?? '<email anggota>'} / ${devPassword}  (semua akun manusia memakai password ini)`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
