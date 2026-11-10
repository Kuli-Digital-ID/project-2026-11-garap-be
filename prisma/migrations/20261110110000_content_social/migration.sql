-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "content_format" TEXT,
ADD COLUMN     "occurrence" DATE,
ADD COLUMN     "schedule_id" INTEGER;

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "content_post_id" INTEGER;

-- CreateTable
CREATE TABLE "social_channels" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "external_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'terhubung',
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[],
    "meta" JSONB NOT NULL DEFAULT '{}',
    "added_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "social_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_channels" (
    "project_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,

    CONSTRAINT "project_channels_pkey" PRIMARY KEY ("project_id","channel_id")
);

-- CreateTable
CREATE TABLE "content_schedules" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "channel_ids" INTEGER[],
    "days" INTEGER[],
    "time" TEXT NOT NULL,
    "lead_days" INTEGER NOT NULL DEFAULT 3,
    "assignee_id" INTEGER,
    "checklist" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_posts" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "title" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "scheduled_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draf',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "external_id" TEXT,
    "url" TEXT,
    "error" TEXT,
    "remote" JSONB,
    "metrics" JSONB,
    "metrics_at" TIMESTAMP(3),
    "reminded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_channels_platform_external_id_key" ON "social_channels"("platform", "external_id");

-- CreateIndex
CREATE INDEX "content_posts_status_scheduled_at_idx" ON "content_posts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_posts_ticket_id_channel_id_key" ON "content_posts"("ticket_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_schedule_id_occurrence_key" ON "tickets"("schedule_id", "occurrence");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "content_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_content_post_id_fkey" FOREIGN KEY ("content_post_id") REFERENCES "content_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_channels" ADD CONSTRAINT "social_channels_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_channels" ADD CONSTRAINT "project_channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_channels" ADD CONSTRAINT "project_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "social_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedules" ADD CONSTRAINT "content_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_schedules" ADD CONSTRAINT "content_schedules_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "social_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
