import { PrismaClient } from '@prisma/client';

/** Kosongkan semua tabel aplikasi dan reset nomor id (riwayat migrasi tidak disentuh). */
export const truncateAll = async (prisma: PrismaClient) => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
};
