import { PrismaService } from '@common/prisma/prisma.service';

export type AgentJobKind = 'assign' | 'mention' | 'comment' | 'dm' | 'manual';

export interface EnqueueInput {
  /** Kandidat penerima; yang bukan agent aktif diabaikan. */
  userIds: (number | null | undefined)[];
  kind: AgentJobKind;
  actorId?: number | null;
  ticketKey?: string;
  conversationId?: number;
  projectSlug?: string;
  prompt?: string;
}

/** Batas berantai: satu agent tidak diaktifkan lebih dari ini untuk pemicu yang sama dalam 10 menit. */
const CHAIN_LIMIT = 6;

/**
 * Masukkan tugas ke antrean untuk agent di antara `userIds`. Dipanggil dari notifikasi (tugas/mention/komentar)
 * dan dari chat (pesan langsung). Mengembalikan jumlah tugas yang dibuat.
 */
export async function enqueueAgentJobs(prisma: PrismaService, input: EnqueueInput): Promise<number> {
  const ids = [...new Set(input.userIds.filter((id): id is number => !!id && id !== input.actorId))];
  if (!ids.length) return 0;
  const agents = await prisma.user.findMany({ where: { id: { in: ids }, kind: 'agent', is_active: true, deleted_at: null }, select: { id: true } });
  let created = 0;
  for (const a of agents) {
    // Cegah putaran tanpa akhir antar agent / komentar beruntun pada tiket yang sama.
    const since = new Date(Date.now() - 10 * 60_000);
    const recent = await prisma.agentJob.count({
      where: { agent_id: a.id, created_at: { gte: since }, ...(input.ticketKey ? { ticket_key: input.ticketKey } : input.conversationId ? { conversation_id: input.conversationId } : {}) },
    });
    if (recent >= CHAIN_LIMIT) continue;
    // Jangan menumpuk tugas identik yang belum diproses.
    const dup = await prisma.agentJob.findFirst({
      where: { agent_id: a.id, status: 'queued', kind: input.kind, ticket_key: input.ticketKey ?? null, conversation_id: input.conversationId ?? null },
      select: { id: true },
    });
    if (dup && input.kind !== 'dm') continue;
    await prisma.agentJob.create({
      data: {
        agent_id: a.id,
        kind: input.kind,
        actor_id: input.actorId ?? null,
        ticket_key: input.ticketKey ?? null,
        conversation_id: input.conversationId ?? null,
        project_slug: input.projectSlug ?? null,
        prompt: (input.prompt ?? '').slice(0, 8000),
      },
    });
    created++;
  }
  return created;
}
