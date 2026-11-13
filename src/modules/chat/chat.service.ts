import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { isManager, projectScope } from '@common/helpers/access';
import { NotificationsService } from '@modules/activity/notifications.service';
import { RealtimeBus } from '@modules/realtime/realtime.bus';
import { AddMembersDto, CreateChannelDto, MessagesQueryDto, SendMessageDto, UpdateChannelDto } from './core/dto/chat.dto';
import { ConversationRow, conversationInclude, messageInclude, toConversation, toMessage } from './chat.serializer';

const slugName = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const CARD_KINDS = ['doc', 'approval', 'ticket'];

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private bus: RealtimeBus,
  ) {}

  private isGuest = (u: JwtPayload) => u.positionName === 'Tamu';

  // ---------- helper ----------

  /** Kanal yang boleh diakses: anggota, atau kanal publik (bukan DM) untuk non-tamu. */
  private async load(user: JwtPayload, id: number) {
    const conv = await this.prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
    if (!conv) throw new NotFoundException('Percakapan tidak ditemukan');
    const member = conv.members.some((m) => m.user_id === user.userId);
    const visible = member || (conv.kind === 'channel' && !conv.is_private && !this.isGuest(user));
    if (!visible) throw new NotFoundException('Percakapan tidak ditemukan');
    return { conv, member };
  }

  private canManage(user: JwtPayload, conv: { created_by: number | null; kind: string }) {
    return conv.kind === 'channel' && (isManager(user) || conv.created_by === user.userId);
  }

  private async usersByName(usernames: string[]) {
    const names = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
    if (!names.length) return [];
    const users = await this.prisma.user.findMany({ where: { username: { in: names }, deleted_at: null, is_active: true }, select: { id: true, username: true } });
    const missing = names.filter((n) => !users.some((u) => u.username === n));
    if (missing.length) throw new BadRequestException(`Anggota tidak ditemukan: ${missing.join(', ')}`);
    return users;
  }

  /** Beri tahu klien bahwa daftar kanal berubah (anggota; kanal publik juga untuk semua non-tamu). */
  private channelChanged(conv: { id: number; is_private: boolean; kind: string }, memberUserIds: number[], extra: Record<string, unknown> = {}) {
    const data = { op: 'channel', conversationId: String(conv.id), ...extra };
    this.bus.publish({ type: 'chat', data, to: { users: memberUserIds } });
    if (conv.kind === 'channel' && !conv.is_private) this.bus.publish({ type: 'chat', data });
  }

  private async unreadOf(userId: number, rows: ConversationRow[]) {
    const counts = await Promise.all(
      rows.map((c) => {
        const mine = c.members.find((m) => m.user_id === userId);
        if (!mine) return Promise.resolve(0);
        return this.prisma.chatMessage.count({ where: { conversation_id: c.id, id: { gt: mine.last_read_id }, author_id: { not: userId }, deleted_at: null } });
      }),
    );
    return counts;
  }

  private async present(userId: number, rows: ConversationRow[]) {
    const unread = await this.unreadOf(userId, rows);
    const lasts = await Promise.all(
      rows.map((c) => this.prisma.chatMessage.findFirst({ where: { conversation_id: c.id, deleted_at: null }, orderBy: { id: 'desc' }, include: messageInclude })),
    );
    const creators = new Map(
      (await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.created_by).filter((x): x is number => !!x) } }, select: { id: true, username: true } })).map((u) => [u.id, u.username]),
    );
    return rows.map((c, i) => ({ ...toConversation(c, userId, unread[i], lasts[i]), createdBy: c.created_by ? creators.get(c.created_by) : undefined }));
  }

  // ---------- kanal ----------

  async list(user: JwtPayload) {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ members: { some: { user_id: user.userId } } }, ...(this.isGuest(user) ? [] : [{ kind: 'channel', is_private: false }])] },
      include: conversationInclude,
      orderBy: [{ last_message_at: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    });
    return this.present(user.userId, rows);
  }

  async create(user: JwtPayload, dto: CreateChannelDto) {
    if (this.isGuest(user)) throw new ForbiddenException('Tamu tidak bisa membuat kanal');
    const name = slugName(dto.name);
    if (name.length < 2) throw new BadRequestException('Nama kanal minimal 2 huruf atau angka');
    if (await this.prisma.conversation.findFirst({ where: { kind: 'channel', name } })) throw new ConflictException(`Kanal #${name} sudah ada`);

    let project: { id: number; members: { user_id: number }[] } | null = null;
    if (dto.project) {
      project = await this.prisma.project.findFirst({ where: { slug: dto.project, deleted_at: null, ...projectScope(user) }, select: { id: true, members: { select: { user_id: true } } } });
      if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    }
    const named = await this.usersByName(dto.memberIds ?? []);
    const ids = new Set<number>([user.userId, ...named.map((u) => u.id)]);
    if (project && !named.length) project.members.forEach((m) => ids.add(m.user_id));

    const conv = await this.prisma.conversation.create({
      data: {
        kind: 'channel',
        name,
        topic: dto.topic ?? '',
        is_private: dto.isPrivate ?? false,
        project_id: project?.id,
        created_by: user.userId,
        members: { create: [...ids].map((user_id) => ({ user_id })) },
      },
      include: conversationInclude,
    });
    this.channelChanged(conv, [...ids]);
    return (await this.present(user.userId, [conv]))[0];
  }

  /** Buka (atau buat) pesan langsung dengan satu anggota. */
  async direct(user: JwtPayload, username: string) {
    if (this.isGuest(user)) throw new ForbiddenException('Tamu tidak bisa memulai pesan langsung');
    const [other] = await this.usersByName([username]);
    if (!other) throw new NotFoundException('Anggota tidak ditemukan');
    if (other.id === user.userId) throw new BadRequestException('Tidak bisa mengirim pesan ke diri sendiri');
    const dm_key = [user.userId, other.id].sort((a, b) => a - b).join(':');
    let conv = await this.prisma.conversation.findUnique({ where: { dm_key }, include: conversationInclude });
    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: { kind: 'dm', dm_key, created_by: user.userId, is_private: true, members: { create: [{ user_id: user.userId }, { user_id: other.id }] } },
        include: conversationInclude,
      });
      this.channelChanged(conv, [user.userId, other.id]);
    }
    return (await this.present(user.userId, [conv]))[0];
  }

  async update(user: JwtPayload, id: number, dto: UpdateChannelDto) {
    const { conv } = await this.load(user, id);
    if (!this.canManage(user, conv)) throw new ForbiddenException('Hanya pembuat kanal, Admin, atau Owner yang bisa mengubah kanal');
    const data: Prisma.ConversationUpdateInput = {};
    if (dto.name !== undefined) {
      const name = slugName(dto.name);
      if (name.length < 2) throw new BadRequestException('Nama kanal minimal 2 huruf atau angka');
      if (name !== conv.name && (await this.prisma.conversation.findFirst({ where: { kind: 'channel', name, id: { not: id } } }))) throw new ConflictException(`Kanal #${name} sudah ada`);
      data.name = name;
    }
    if (dto.topic !== undefined) data.topic = dto.topic;
    if (dto.isPrivate !== undefined) data.is_private = dto.isPrivate;
    const row = await this.prisma.conversation.update({ where: { id }, data, include: conversationInclude });
    this.channelChanged(row, row.members.map((m) => m.user_id));
    return (await this.present(user.userId, [row]))[0];
  }

  async remove(user: JwtPayload, id: number) {
    const { conv } = await this.load(user, id);
    if (!this.canManage(user, conv)) throw new ForbiddenException('Hanya pembuat kanal, Admin, atau Owner yang bisa menghapus kanal');
    await this.prisma.conversation.delete({ where: { id } });
    this.channelChanged(conv, conv.members.map((m) => m.user_id), { removed: true });
    return { deleted: String(id) };
  }

  async addMembers(user: JwtPayload, id: number, dto: AddMembersDto) {
    const { conv } = await this.load(user, id);
    if (!this.canManage(user, conv)) throw new ForbiddenException('Hanya pembuat kanal, Admin, atau Owner yang bisa menambah anggota');
    const users = await this.usersByName(dto.usernames);
    await this.prisma.conversationMember.createMany({ data: users.map((u) => ({ conversation_id: id, user_id: u.id })), skipDuplicates: true });
    const row = await this.prisma.conversation.findUniqueOrThrow({ where: { id }, include: conversationInclude });
    this.channelChanged(row, row.members.map((m) => m.user_id));
    return (await this.present(user.userId, [row]))[0];
  }

  /** Keluar sendiri, atau mengeluarkan anggota lain (pembuat/Admin/Owner). */
  async removeMember(user: JwtPayload, id: number, username: string) {
    const { conv } = await this.load(user, id);
    if (conv.kind === 'dm') throw new BadRequestException('Pesan langsung tidak punya anggota yang bisa dikeluarkan');
    const target = conv.members.find((m) => m.user.username === username.toLowerCase());
    if (!target) throw new NotFoundException('Anggota tidak ada di kanal ini');
    if (target.user_id !== user.userId && !this.canManage(user, conv)) throw new ForbiddenException('Anda tidak bisa mengeluarkan anggota lain');
    await this.prisma.conversationMember.deleteMany({ where: { conversation_id: id, user_id: target.user_id } });
    this.channelChanged(conv, conv.members.map((m) => m.user_id));
    return { removed: target.user.username };
  }

  async join(user: JwtPayload, id: number) {
    const { conv, member } = await this.load(user, id);
    if (conv.kind !== 'channel' || conv.is_private) throw new ForbiddenException('Kanal ini hanya bisa dimasuki lewat undangan');
    if (!member) await this.prisma.conversationMember.create({ data: { conversation_id: id, user_id: user.userId, last_read_id: 0 } }).catch(() => undefined);
    const row = await this.prisma.conversation.findUniqueOrThrow({ where: { id }, include: conversationInclude });
    this.channelChanged(row, row.members.map((m) => m.user_id));
    return (await this.present(user.userId, [row]))[0];
  }

  // ---------- pesan ----------

  async messages(user: JwtPayload, id: number, q: MessagesQueryDto) {
    await this.load(user, id);
    const limit = q.limit ?? 50;
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversation_id: id, deleted_at: null, ...(q.before ? { id: { lt: q.before } } : {}) },
      include: messageInclude,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit).reverse().map(toMessage), hasMore };
  }

  private cleanCard(card?: Record<string, unknown>) {
    if (!card) return undefined;
    const kind = String(card.kind ?? '');
    if (!CARD_KINDS.includes(kind)) throw new BadRequestException('Jenis kartu harus doc, approval, atau ticket');
    const href = card.href ? String(card.href).slice(0, 300) : undefined;
    if (href && !href.startsWith('/')) throw new BadRequestException('Tautan kartu harus berupa alamat di dalam aplikasi');
    return { kind, title: String(card.title ?? '').slice(0, 200), sub: String(card.sub ?? '').slice(0, 200), ...(href ? { href } : {}) };
  }

  async send(user: JwtPayload, id: number, dto: SendMessageDto) {
    const { conv, member } = await this.load(user, id);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Pesan tidak boleh kosong');
    // Mengirim ke kanal publik otomatis bergabung.
    if (!member) await this.prisma.conversationMember.create({ data: { conversation_id: id, user_id: user.userId } }).catch(() => undefined);

    const msg = await this.prisma.chatMessage.create({
      data: { conversation_id: id, author_id: user.userId, body: text, card: (this.cleanCard(dto.card) as Prisma.InputJsonValue) ?? undefined },
      include: messageInclude,
    });
    await this.prisma.conversation.update({ where: { id }, data: { last_message_at: msg.created_at } });
    await this.prisma.conversationMember.updateMany({ where: { conversation_id: id, user_id: user.userId }, data: { last_read_id: msg.id } });

    const members = await this.prisma.conversationMember.findMany({ where: { conversation_id: id }, select: { user_id: true } });
    const memberIds = members.map((m) => m.user_id);
    const message = toMessage(msg);
    this.bus.publish({ type: 'chat', data: { op: 'message', conversationId: String(id), message }, to: { users: memberIds } });
    if (!member && !conv.is_private) this.channelChanged(conv, memberIds);

    // @mention hanya sampai ke anggota percakapan itu.
    const mentioned = (await this.notifications.mentionedIds(text)).filter((uid) => memberIds.includes(uid));
    await this.notifications.notify({
      recipientIds: mentioned,
      actorId: user.userId,
      kind: 'mention',
      text: conv.kind === 'dm' ? 'menyebut Anda di pesan langsung' : `menyebut Anda di #${conv.name}`,
      target: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      href: `/percakapan?c=${id}`,
    });
    return message;
  }

  private async ownMessage(user: JwtPayload, id: number, mid: number) {
    await this.load(user, id);
    const msg = await this.prisma.chatMessage.findFirst({ where: { id: mid, conversation_id: id, deleted_at: null }, include: messageInclude });
    if (!msg) throw new NotFoundException('Pesan tidak ditemukan');
    return msg;
  }

  async edit(user: JwtPayload, id: number, mid: number, text: string) {
    const msg = await this.ownMessage(user, id, mid);
    if (msg.author_id !== user.userId) throw new ForbiddenException('Hanya pengirim yang bisa mengubah pesannya');
    const body = text.trim();
    if (!body) throw new BadRequestException('Pesan tidak boleh kosong');
    const row = await this.prisma.chatMessage.update({ where: { id: mid }, data: { body, edited_at: new Date() }, include: messageInclude });
    const members = await this.prisma.conversationMember.findMany({ where: { conversation_id: id }, select: { user_id: true } });
    const message = toMessage(row);
    this.bus.publish({ type: 'chat', data: { op: 'message.edit', conversationId: String(id), message }, to: { users: members.map((m) => m.user_id) } });
    return message;
  }

  async removeMessage(user: JwtPayload, id: number, mid: number) {
    const msg = await this.ownMessage(user, id, mid);
    if (msg.author_id !== user.userId && !isManager(user)) throw new ForbiddenException('Hanya pengirim, Admin, atau Owner yang bisa menghapus pesan');
    await this.prisma.chatMessage.update({ where: { id: mid }, data: { deleted_at: new Date() } });
    const members = await this.prisma.conversationMember.findMany({ where: { conversation_id: id }, select: { user_id: true } });
    this.bus.publish({ type: 'chat', data: { op: 'message.delete', conversationId: String(id), messageId: String(mid) }, to: { users: members.map((m) => m.user_id) } });
    return { deleted: String(mid) };
  }

  async markRead(user: JwtPayload, id: number, upTo?: number) {
    const { member } = await this.load(user, id);
    if (!member) return { unread: 0 };
    const latest = await this.prisma.chatMessage.findFirst({ where: { conversation_id: id, deleted_at: null }, orderBy: { id: 'desc' }, select: { id: true } });
    const target = Math.min(upTo ?? latest?.id ?? 0, latest?.id ?? 0);
    const cur = await this.prisma.conversationMember.findFirst({ where: { conversation_id: id, user_id: user.userId } });
    if (cur && target > cur.last_read_id) {
      await this.prisma.conversationMember.update({ where: { id: cur.id }, data: { last_read_id: target } });
    }
    const unread = await this.prisma.chatMessage.count({
      where: { conversation_id: id, id: { gt: Math.max(target, cur?.last_read_id ?? 0) }, author_id: { not: user.userId }, deleted_at: null },
    });
    // Tab lain milik akun yang sama ikut menghapus lencana belum dibaca.
    this.bus.publish({ type: 'chat', data: { op: 'read', conversationId: String(id), unread }, to: { users: [user.userId] } });
    return { unread };
  }
}
