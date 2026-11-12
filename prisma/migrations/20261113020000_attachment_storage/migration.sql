-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "storage" TEXT;

-- File yang sudah diunggah sebelum kolom ini ada tersimpan di folder lokal.
UPDATE "attachments" SET "storage" = 'local' WHERE "storage_key" IS NOT NULL AND "storage" IS NULL;
