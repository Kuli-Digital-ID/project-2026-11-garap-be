import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { notificationInclude, toNotification } from '@common/serializers';
import { RealtimeBus } from '@modules/realtime/realtime.bus';
import { AgentJobKind, enqueueAgentJobs } from '@modules/agents/core/agent-queue';
import { MailService } from './mail.service';

export const NOTIF_KINDS = ['mention', 'assign', 'approval', 'comment', 'status', 'due', 'agent'] as const;
export type NotifKind = (typeof NOTIF_KINDS)[number];
/** Bawaan email: hanya yang butuh tindakan. Komentar & perubahan status cukup di dalam aplikasi. */
export const DEFAULT_EMAIL: Record<NotifKind, boolean> = { mention: true, assign: true, approval: true, due: true, comment: false, status: false, agent: false };
type Channel = 'inapp' | 'email';
type Prefs = { inapp?: Partial<Record<NotifKind, boolean>>; email?: Partial<Record<NotifKind, boolean>> } | null | undefined;

export const wants = (prefs: unknown, channel: Channel, kind: string): boolean => {
  const v = (prefs as Prefs)?.[channel]?.[kind as NotifKind];
  if (typeof v === 'boolean') return v;
  return channel === 'inapp' ? true : (DEFAULT_EMAIL[kind as NotifKind] ?? false);
};

export interface NotifyInput {
  recipientIds: (number | null | undefined)[];
  actorId?: number | null;
  kind: NotifKind;
  text: string;
  target?: string;
  href: string;
  project?: string;
  /** Konteks untuk agent penerima: tiket / percakapan asal dan teks pemicunya. */
  ticketKey?: string;
  conversationId?: number;
  prompt?: string;
  /** Bila diisi, penerima yang sudah pernah menerima kunci ini dilewati (pengingat tenggat). */
  dedupeKey?: string;
  /** true = hanya di dalam aplikasi (email diurus pemanggil, mis. ringkasan pengingat). */
  skipEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private bus: RealtimeBus,
    private mail: MailService,
  ) {}

  /** Kirim notifikasi ke beberapa penerima (pelaku tidak menerima notifikasinya sendiri). */
  async notify(n: NotifyInput) {
    const ids = [...new Set(n.recipientIds.filter((id): id is number => !!id && id !== n.actorId))];
    if (!ids.length) return;
    let users = await this.prisma.user.findMany({
      where: { id: { in: ids }, deleted_at: null },
      select: { id: true, kind: true, email: true, display_name: true, is_active: true, notif_prefs: true },
    });
    // Anti-ganda: lewati penerima yang sudah punya kunci ini.
    if (n.dedupeKey) {
      const seen = await this.prisma.notification.findMany({ where: { recipient_id: { in: ids }, dedupe_key: n.dedupeKey }, select: { recipient_id: true } });
      const skip = new Set(seen.map((x) => x.recipient_id));
      users = users.filter((u) => !skip.has(u.id));
    }
    if (!users.length) return;

    // Di dalam aplikasi: agent selalu menerima (untuk membangunkannya); manusia mengikuti preferensi.
    // Bila ada kunci anti-ganda, baris tetap dibuat (langsung terbaca) agar pengingat tidak terulang.
    const rows = users
      .map((u) => ({ u, inapp: u.kind === 'agent' || wants(u.notif_prefs, 'inapp', n.kind) }))
      .filter((x) => x.inapp || n.dedupeKey);
    if (rows.length) {
      await this.prisma.notification.createMany({
        data: rows.map(({ u, inapp }) => ({
          recipient_id: u.id,
          actor_id: n.actorId ?? null,
          kind: n.kind,
          text: n.text,
          target: n.target,
          href: n.href,
          project_slug: n.project,
          dedupe_key: n.dedupeKey ?? null,
          read_at: inapp ? null : new Date(),
        })),
        skipDuplicates: true,
      });
      const live = rows.filter((x) => x.inapp).map((x) => x.u.id);
      // Beri tahu penerima yang sedang terhubung agar lonceng & kotak masuk langsung diperbarui.
      if (live.length) this.bus.publish({ type: 'notification', data: { kind: n.kind }, to: { users: live } });
    }

    // Email: hanya manusia aktif dengan alamat sungguhan dan jenis yang diaktifkan.
    if (this.mail.enabled && !n.skipEmail) {
      const actor = n.actorId ? await this.prisma.user.findUnique({ where: { id: n.actorId }, select: { display_name: true } }) : null;
      const text = actor ? `${actor.display_name} ${n.text}` : n.text;
      for (const u of users) {
        if (u.kind !== 'human' || !u.is_active || u.email.endsWith('.local') || !wants(u.notif_prefs, 'email', n.kind)) continue;
        void this.mail.sendNotification(u.email, { name: u.display_name, text, target: n.target, href: n.href });
      }
    }
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

  async getPreferences(userId: number) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notif_prefs: true, email: true } });
    const inapp: Record<string, boolean> = {};
    const email: Record<string, boolean> = {};
    for (const k of NOTIF_KINDS) {
      inapp[k] = wants(u?.notif_prefs, 'inapp', k);
      email[k] = wants(u?.notif_prefs, 'email', k);
    }
    return { inapp, email, mailEnabled: this.mail.enabled, address: u?.email ?? '' };
  }

  async setPreferences(userId: number, input: { inapp?: Record<string, unknown>; email?: Record<string, unknown> }) {
    const clean = (o?: Record<string, unknown>) => {
      const out: Record<string, boolean> = {};
      for (const k of NOTIF_KINDS) if (typeof o?.[k] === 'boolean') out[k] = o[k] as boolean;
      return out;
    };
    // 'mention' dan 'approval' tidak boleh dibisukan di dalam aplikasi: terlalu mudah terlewat.
    const inapp = clean(input.inapp);
    inapp.mention = true;
    inapp.approval = true;
    await this.prisma.user.update({ where: { id: userId }, data: { notif_prefs: { inapp, email: clean(input.email) } } });
    return this.getPreferences(userId);
  }

  async sendTestEmail(userId: number) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, display_name: true } });
    if (!u) return { sent: false, reason: 'Akun tidak ditemukan' };
    if (!this.mail.enabled) return { sent: false, reason: 'Email belum diaktifkan di server (MAIL_HOST kosong).' };
    const ok = await this.mail.sendNotification(u.email, { name: u.display_name, text: 'Email uji dari Garap berhasil terkirim', target: 'Pengaturan notifikasi', href: '/pengaturan/notifikasi' });
    return ok ? { sent: true } : { sent: false, reason: 'Server email menolak atau tidak bisa dihubungi. Periksa MAIL_HOST/PORT/USER/PASS di server.' };
  }
}
