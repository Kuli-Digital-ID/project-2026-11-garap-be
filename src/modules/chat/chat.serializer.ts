import { Prisma } from '@prisma/client';

export const conversationInclude = {
  project: { select: { slug: true } },
  members: { select: { user_id: true, last_read_id: true, user: { select: { username: true, display_name: true, role: true, kind: true } } } },
} satisfies Prisma.ConversationInclude;

export type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

export const messageInclude = { author: { select: { username: true } } } satisfies Prisma.ChatMessageInclude;
export type MessageRow = Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>;

export const toMessage = (m: MessageRow) => ({
  id: String(m.id),
  channelId: String(m.conversation_id),
  authorId: m.author.username,
  text: m.body,
  time: m.created_at.toISOString(),
  card: (m.card as unknown) ?? undefined,
  edited: !!m.edited_at,
});

/** Bentuk kanal untuk FE; nama & topik DM mengikuti lawan bicara (dari sudut pandang `meId`). */
export const toConversation = (c: ConversationRow, meId: number, unread = 0, last?: MessageRow | null) => {
  const other = c.kind === 'dm' ? c.members.find((m) => m.user_id !== meId) : undefined;
  return {
    id: String(c.id),
    kind: c.kind,
    name: c.kind === 'dm' ? (other?.user.display_name ?? 'Percakapan') : c.name,
    topic: c.kind === 'dm' ? (other?.user.role ?? '') : c.topic,
    memberIds: c.members.map((m) => m.user.username),
    project: c.project?.slug ?? undefined,
    isPrivate: c.is_private,
    dmWith: other?.user.username,
    joined: c.members.some((m) => m.user_id === meId),
    unread,
    createdBy: undefined as string | undefined,
    lastMessageAt: c.last_message_at?.toISOString(),
    lastMessage: last ? { authorId: last.author.username, text: last.body.slice(0, 120), time: last.created_at.toISOString() } : undefined,
  };
};
