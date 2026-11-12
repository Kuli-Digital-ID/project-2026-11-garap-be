-- DropIndex
DROP INDEX "users_sso_subject_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "sso_subject",
ADD COLUMN     "failed_logins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "mime" TEXT,
ADD COLUMN     "storage_key" TEXT;
