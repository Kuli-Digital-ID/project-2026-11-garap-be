import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { notificationInclude, toNotification } from '@common/serializers';

export interface NotifyInput {
  recipientIds: (number | null | undefined)[];
  actorId?: number | null;
  kind: 'mention' | 'assign' | 'approval' | 'agent' | 'comment' | 'status';
  text: string;
  target?: string;
  href: string;
  project?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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
