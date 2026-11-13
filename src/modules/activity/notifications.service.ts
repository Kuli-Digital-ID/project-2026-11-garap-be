import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { notificationInclude, toNotification } from '@common/serializers';
import { RealtimeBus } from '@modules/realtime/realtime.bus';
import { AgentJobKind, enqueueAgentJobs } from '@modules/agents/core/agent-queue';

export interface NotifyInput {
  recipientIds: (number | null | undefined)[];
  actorId?: number | null;
  kind: 'mention' | 'assign' | 'approval' | 'agent' | 'comment' | 'status';
  text: string;
  target?: string;
  href: string;
  project?: string;
  /** Konteks untuk agent penerima: tiket / percakapan asal dan teks pemicunya. */
  ticketKey?: string;
  conversationId?: number;
  prompt?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private bus: RealtimeBus,
  ) {}

  /** Kirim notifikasi ke beberapa penerima (pelaku tidak menerima notifikasinya sendiri). */
  async notify(n: NotifyInput) {
    const ids = [...new Set(n.recipientIds.filter((id): id is number => !!id && id !== n.actorId))];
    if (!ids.length) return;
    await this.prisma.notification.createMany({
      data: ids.map((recipient_id) => ({
        recipient_id,
        actor_id: n.actorId ?? null,
        kind: n.kind,
        text: n.text,
        target: n.target,
        href: n.href,
        project_slug: n.project,
      })),
    });
    // Beri tahu penerima yang sedang terhubung agar lonceng & kotak masuk langsung diperbarui.
    this.bus.publish({ type: 'notification', data: { kind: n.kind }, to: { users: ids } });
    await this.wakeAgents(n, ids);
  }

  /** Penerima yang berupa agent dimasukkan ke antrean kerja. Komentar dari sesama agent tidak membangunkan agent. */
  private async wakeAgents(n: NotifyInput, ids: number[]) {
    try {
      const kind: AgentJobKind | null = n.kind === 'assign' ? 'assign' : n.kind === 'mention' ? 'mention' : n.kind === 'comment' ? 'comment' : n.kind === 'approval' ? 'manual' : null;
      if (!kind) return;
      if (kind === 'comment' && n.actorId) {
        const actor = await this.prisma.user.findUnique({ where: { id: n.actorId }, select: { kind: true } });
        if (actor?.kind === 'agent') return;
      }
      const prompt = kind === 'manual' ? `Keputusan persetujuan: pengguna ${n.text}${n.target ? ` — "${n.target}"` : ''}. Lanjutkan pekerjaan sesuai keputusan itu.` : (n.prompt ?? n.text);
      await enqueueAgentJobs(this.prisma, { userIds: ids, kind, actorId: n.actorId, ticketKey: n.ticketKey, conversationId: n.conversationId, projectSlug: n.project, prompt });
    } catch {
      // Antrean gagal tidak boleh menggagalkan notifikasi.
    }
  }

  /** Cari @username di teks lalu kembalikan id user-nya. */
  async mentionedIds(text: string) {
    const names = [...new Set([...text.matchAll(/@([a-z0-9._-]+)/gi)].map((m) => m[1].toLowerCase()))];
    if (!names.length) return [];
    const users = await this.prisma.user.findMany({ where: { username: { in: names } }, select: { id: true } });
    return users.map((u) => u.id);
  }

  async list(userId: number, unreadOnly = false, limit = 50) {
    const rows = await this.prisma.notification.findMany({
      where: { recipient_id: userId, ...(unreadOnly ? { read_at: null } : {}) },
      include: notificationInclude,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    const unread = await this.prisma.notification.count({ where: { recipient_id: userId, read_at: null } });
    return { items: rows.map(toNotification), unread };
  }

  async markRead(userId: number, ids?: number[]) {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipient_id: userId, read_at: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { read_at: new Date() },
    });
    return { updated: count };
  }
}
