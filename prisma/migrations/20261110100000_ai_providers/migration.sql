-- AlterTable
ALTER TABLE "agent_profiles" ADD COLUMN     "model_id" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'anthropic';

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "api_key_enc" TEXT,
    "key_hint" TEXT NOT NULL DEFAULT '',
    "base_url" TEXT,
    "models" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'terhubung',
    "last_error" TEXT,
    "last_tested_at" TIMESTAMP(3),
    "added_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_provider_key" ON "ai_providers"("provider");

-- AddForeignKey
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Isi model_id agent lama dari nama model, mis. "Claude Opus 5.5" -> "claude-opus-5-5"
UPDATE "agent_profiles" SET "model_id" = lower(replace(replace("model", ' ', '-'), '.', '-')) WHERE "model_id" IS NULL;
