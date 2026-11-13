-- CreateTable
CREATE TABLE "agent_jobs" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "ticket_key" TEXT,
    "conversation_id" INTEGER,
    "prompt" TEXT NOT NULL DEFAULT '',
    "actor_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "run_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_usage" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "model" TEXT NOT NULL DEFAULT '',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_jobs_status_run_after_idx" ON "agent_jobs"("status", "run_after");

-- CreateIndex
CREATE INDEX "agent_jobs_agent_id_created_at_idx" ON "agent_jobs"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_usage_agent_id_created_at_idx" ON "agent_usage"("agent_id", "created_at");

-- AddForeignKey
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
