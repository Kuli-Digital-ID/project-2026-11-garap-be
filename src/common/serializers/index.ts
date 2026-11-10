import { Prisma } from '@prisma/client';

/**
 * Pengubah baris database → bentuk JSON yang dipakai FE (lihat FE src/lib/types.ts).
 * Id anggota memakai `username` (mis. "bhagas"), proyek memakai `slug`, tiket memakai `key`.
 */

const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const date = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

// ---------- Anggota ----------

export const memberInclude = {
  position: { select: { name: true } },
  division: { select: { slug: true } },
} satisfies Prisma.UserInclude;

export type MemberRow = Prisma.UserGetPayload<{ include: typeof memberInclude }>;

export const toMember = (u: MemberRow) => ({
  id: u.username,
  userId: u.id,
  name: u.display_name,
  fullName: [u.first_name, u.last_name].filter(Boolean).join(' '),
  kind: u.kind,
  role: u.role,
  team: u.team,
  division: u.division?.slug ?? null,
  initials: u.initials,
  color: u.color ?? undefined,
  email: u.kind === 'agent' ? undefined : u.email,
  access: u.position.name,
  status: u.status,
  floor: u.floor ?? undefined,
  joined: date(u.joined_at),
  isActive: u.is_active,
  lastLoginAt: iso(u.last_login_at),
});

export const userRef = { select: { username: true } } as const;
const uname = (u?: { username: string } | null) => u?.username;

// ---------- Agent ----------

export const agentInclude = {
  ...memberInclude,
  agent_profile: { include: { supervisor: userRef } },
} satisfies Prisma.UserInclude;

export type AgentRow = Prisma.UserGetPayload<{ include: typeof agentInclude }>;

export const toAgent = (u: AgentRow) => {
  const a = u.agent_profile;
  return {
    ...toMember(u),
    profile: a
      ? {
          id: u.username,
          provider: a.provider,
          modelId: a.model_id ?? undefined,
          model: a.model,
          description: a.description,
          skills: a.skills,
          budget: a.budget,
          spent: a.spent,
          tasksDone: a.tasks_done,
          avgMinutes: a.avg_minutes,
          approvalRate: a.approval_rate,
          currentTask: a.current_task ?? undefined,
          supervisorId: uname(a.supervisor),
          tools: a.tools,
          learnings: a.learnings,
          usage: a.usage,
        }
      : null,
  };
};

// ---------- Divisi ----------

export const divisionInclude = { lead: userRef, _count: { select: { members: true, projects: true } } } satisfies Prisma.DivisionInclude;
export type DivisionRow = Prisma.DivisionGetPayload<{ include: typeof divisionInclude }>;

export const toDivision = (d: DivisionRow) => ({
  id: d.slug,
  name: d.name,
  color: d.color,
  leadId: uname(d.lead),
  description: d.description,
  requestKinds: d.request_kinds,
  memberCount: d._count.members,
  projectCount: d._count.projects,
});

// ---------- Proyek ----------

export const projectInclude = {
  lead: userRef,
  division: { select: { slug: true } },
  members: { select: { user: userRef }, orderBy: { id: 'asc' } },
  workflow: { orderBy: { position: 'asc' } },
  sprints: { where: { state: { in: ['aktif', 'rencana'] } }, orderBy: { start_date: 'asc' } },
  _count: { select: { tickets: { where: { deleted_at: null } } } },
} satisfies Prisma.ProjectInclude;

export type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
export type WorkflowRow = ProjectRow['workflow'][number];
export type SprintRow = ProjectRow['sprints'][number];

export const toWorkflowStatus = (s: WorkflowRow) => ({
  id: s.code,
  name: s.name,
  category: s.category,
  color: s.color,
  wip: s.wip ?? undefined,
});

export const toSprint = (s: SprintRow) => ({
  id: s.id,
  name: s.name,
  goal: s.goal,
  start: date(s.start_date),
  end: date(s.end_date),
  state: s.state,
  completedAt: iso(s.completed_at),
});

export const toProject = (p: ProjectRow) => {
  const active = p.sprints.find((s) => s.state === 'aktif') ?? p.sprints[0];
  return {
    slug: p.slug,
    name: p.name,
    key: p.key,
    color: p.color,
    description: p.description,
    client: p.client,
    leadId: uname(p.lead),
    memberIds: p.members.map((m) => m.user.username),
    division: p.division?.slug ?? null,
    template: p.template,
    workflow: p.workflow.map(toWorkflowStatus),
    status: p.status,
    sprint: active ? { id: active.id, name: active.name, start: date(active.start_date), end: date(active.end_date), goal: active.goal } : null,
    start: date(p.start_date),
    target: date(p.target_date),
    created: iso(p.created_at),
    ticketCount: p._count.tickets,
  };
};

export const epicInclude = { owner: userRef, project: { select: { slug: true } } } satisfies Prisma.EpicInclude;
export type EpicRow = Prisma.EpicGetPayload<{ include: typeof epicInclude }>;
export const toEpic = (e: EpicRow) => ({
  id: e.id,
  project: e.project.slug,
  name: e.name,
  color: e.color,
  start: e.start_week,
  weeks: e.weeks,
  progress: e.progress,
  ownerId: uname(e.owner),
});

// ---------- Tiket ----------

const attachmentSelect = {
  id: true,
  name: true,
  size: true,
  kind: true,
  url: true,
  created_at: true,
  uploader: userRef,
} satisfies Prisma.AttachmentSelect;

type AttachmentRow = Prisma.AttachmentGetPayload<{ select: typeof attachmentSelect }>;

const fmtSize = (n: number) =>
  n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const toAttachment = (a: AttachmentRow) => ({
  id: a.id,
  name: a.name,
  size: fmtSize(a.size),
  bytes: a.size,
  kind: a.kind,
  url: a.url ?? undefined,
  by: a.uploader.username,
  time: iso(a.created_at),
});

export const postInclude = {
  approver: userRef,
  channel: { select: { id: true, platform: true, handle: true, mode: true } },
} satisfies Prisma.ContentPostInclude;
export type PostRow = Prisma.ContentPostGetPayload<{ include: typeof postInclude }>;

export const toPost = (p: PostRow) => ({
  id: p.id,
  channelId: p.channel_id,
  platform: p.channel.platform,
  handle: p.channel.handle,
  mode: p.channel.mode,
  title: p.title ?? undefined,
  caption: p.caption,
  scheduledAt: iso(p.scheduled_at),
  status: p.status,
  approvedBy: uname(p.approver),
  approvedAt: iso(p.approved_at),
  publishedAt: iso(p.published_at),
  url: p.url ?? undefined,
  error: p.error ?? undefined,
  metrics: (p.metrics as { views: number; likes: number; comments: number; shares: number } | null) ?? undefined,
  metricsAt: iso(p.metrics_at),
});

/** Ringkas: untuk papan, backlog, daftar. */
export const ticketListInclude = {
  posts: { include: postInclude, orderBy: { id: 'asc' } },
  project: { select: { slug: true } },
  status: { select: { code: true, category: true } },
  assignee: userRef,
  reporter: userRef,
  sprint: { select: { id: true, name: true, state: true } },
  parent: { select: { key: true } },
  request: { select: { code: true } },
  checklist: { select: { text: true, done: true }, orderBy: { position: 'asc' } },
  watchers: { select: { user: userRef } },
  _count: { select: { comments: { where: { deleted_at: null } }, attachments: true, subtasks: { where: { deleted_at: null } } } },
} satisfies Prisma.TicketInclude;

/** Lengkap: untuk halaman/panel detail tiket. */
export const ticketDetailInclude = {
  ...ticketListInclude,
  comments: { where: { deleted_at: null }, include: { author: userRef }, orderBy: { created_at: 'asc' } },
  attachments: { select: attachmentSelect, orderBy: { created_at: 'asc' } },
  links_out: { select: { type: true, to: { select: { key: true } } } },
  links_in: { select: { type: true, from: { select: { key: true } } } },
  subtasks: { where: { deleted_at: null }, select: { key: true }, orderBy: { number: 'asc' } },
} satisfies Prisma.TicketInclude;

export type TicketListRow = Prisma.TicketGetPayload<{ include: typeof ticketListInclude }>;
export type TicketDetailRow = Prisma.TicketGetPayload<{ include: typeof ticketDetailInclude }>;

export const toTicket = (t: TicketListRow | TicketDetailRow) => {
  const detail = 'comments' in t && Array.isArray(t.comments);
  const d = t as TicketDetailRow;
  return {
    id: t.id,
    key: t.key,
    project: t.project.slug,
    title: t.title,
    description: t.description,
    type: t.type,
    column: t.status.category,
    status: t.status.code,
    labels: t.labels,
    priority: t.priority,
    assigneeId: uname(t.assignee),
    reporterId: t.reporter.username,
    epicId: t.epic_id ?? undefined,
    inSprint: !!t.sprint && t.sprint.state !== 'selesai',
    sprintId: t.sprint_id ?? undefined,
    archivedSprint: t.sprint?.state === 'selesai' ? t.sprint.name : undefined,
    points: t.points ?? undefined,
    due: date(t.due_date),
    rank: t.rank,
    checklist: t.checklist,
    agentNote: (t.agent_note as object | null) ?? undefined,
    parentKey: t.parent?.key,
    watchers: t.watchers.map((w) => w.user.username),
    dev: (t.dev as object | null) ?? undefined,
    requestId: t.request?.code,
    content: t.content_format || t.posts.length ? { format: t.content_format ?? undefined, posts: t.posts.map(toPost) } : undefined,
    scheduleId: t.schedule_id ?? undefined,
    commentCount: t._count.comments,
    attachmentCount: t._count.attachments,
    subtaskCount: t._count.subtasks,
    created: iso(t.created_at),
    updated: iso(t.updated_at),
    ...(detail
      ? {
          comments: d.comments.map((c) => ({ id: String(c.id), authorId: c.author.username, text: c.body, time: iso(c.created_at) })),
          attachments: d.attachments.map(toAttachment),
          links: [
            ...d.links_out.map((l) => ({ type: l.type, key: l.to.key })),
            ...d.links_in.map((l) => ({ type: l.type === 'memblokir' ? 'diblokir' : l.type, key: l.from.key })),
          ],
          subtasks: d.subtasks.map((s) => s.key),
        }
      : {}),
  };
};

// ---------- Permintaan ----------

export const requestInclude = {
  division: { select: { slug: true } },
  requester: userRef,
  project: { select: { slug: true } },
  ticket: { select: { key: true } },
  attachments: { select: attachmentSelect },
} satisfies Prisma.WorkRequestInclude;

export type RequestRow = Prisma.WorkRequestGetPayload<{ include: typeof requestInclude }>;

export const toRequest = (r: RequestRow) => ({
  id: r.code,
  title: r.title,
  detail: r.detail,
  division: r.division.slug,
  kind: r.kind,
  fromId: r.requester.username,
  priority: r.priority,
  due: date(r.due_date),
  references: r.references,
  attachments: r.attachments.map(toAttachment),
  status: r.status,
  created: iso(r.created_at),
  ticketKey: r.ticket?.key,
  project: r.project?.slug,
  note: r.note ?? undefined,
  agentSummary: r.agent_summary ?? undefined,
});

// ---------- Dokumen ----------

export const docInclude = { project: { select: { slug: true } }, author: userRef, reviewer: userRef } satisfies Prisma.DocInclude;
export type DocRow = Prisma.DocGetPayload<{ include: typeof docInclude }>;

export const toDoc = (d: DocRow) => ({
  id: d.slug,
  project: d.project.slug,
  title: d.title,
  kind: d.kind,
  authorId: d.author.username,
  reviewerId: uname(d.reviewer),
  status: d.status,
  version: d.version,
  updated: iso(d.updated_at),
  pages: d.pages,
  sections: d.sections,
});

// ---------- Persetujuan, notifikasi, audit, run ----------

export const approvalInclude = {
  agent: userRef,
  decider: userRef,
  project: { select: { slug: true } },
  post: { select: { id: true, ticket: { select: { key: true } } } },
} satisfies Prisma.ApprovalInclude;
export type ApprovalRow = Prisma.ApprovalGetPayload<{ include: typeof approvalInclude }>;

export const toApproval = (a: ApprovalRow) => ({
  id: a.id,
  agentId: a.agent.username,
  project: a.project.slug,
  kind: a.kind,
  title: a.title,
  detail: a.detail,
  preview: a.preview ?? undefined,
  risk: a.risk,
  created: iso(a.created_at),
  status: a.status,
  decidedAt: iso(a.decided_at),
  decidedBy: uname(a.decider),
  ticketKey: a.post?.ticket.key,
  postId: a.post?.id,
});

export const notificationInclude = { actor: userRef } satisfies Prisma.NotificationInclude;
export type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

export const toNotification = (n: NotificationRow) => ({
  id: n.id,
  kind: n.kind,
  actorId: uname(n.actor),
  text: n.text,
  target: n.target ?? undefined,
  href: n.href,
  project: n.project_slug ?? undefined,
  time: iso(n.created_at),
  read: !!n.read_at,
});

export const auditInclude = { actor: userRef } satisfies Prisma.AuditLogInclude;
export type AuditRow = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

export const toAudit = (e: AuditRow) => ({
  id: e.id,
  time: iso(e.created_at),
  actorId: uname(e.actor),
  action: e.action,
  target: e.target,
  category: e.category,
  ip: e.ip ?? undefined,
});

export const runInclude = { agent: userRef, project: { select: { slug: true } }, ticket: { select: { key: true } } } satisfies Prisma.AgentRunInclude;
export type RunRow = Prisma.AgentRunGetPayload<{ include: typeof runInclude }>;

export const toRun = (r: RunRow) => ({
  id: r.code,
  agentId: r.agent.username,
  project: r.project.slug,
  ticketKey: r.ticket?.key,
  title: r.title,
  status: r.status,
  started: iso(r.started_at),
  duration: r.duration,
  tokensIn: r.tokens_in,
  tokensOut: r.tokens_out,
  cost: r.cost,
  steps: r.steps,
});

// ---------- Penyedia AI ----------

export const aiProviderInclude = { adder: userRef } satisfies Prisma.AiProviderInclude;
export type AiProviderRow = Prisma.AiProviderGetPayload<{ include: typeof aiProviderInclude }>;

/** API key tidak pernah dikirim ke FE; hanya 4 karakter terakhir. */
export const toAiProvider = (p: AiProviderRow) => ({
  provider: p.provider,
  keyHint: p.key_hint,
  baseUrl: p.base_url ?? undefined,
  models: p.models,
  status: p.status,
  lastError: p.last_error ?? undefined,
  addedBy: uname(p.adder),
  added: iso(p.created_at),
  lastTested: iso(p.last_tested_at),
});

// ---------- Sosmed & konten rutin ----------

export const channelInclude = { adder: userRef, projects: { select: { project: { select: { slug: true } } } } } satisfies Prisma.SocialChannelInclude;
export type ChannelRow = Prisma.SocialChannelGetPayload<{ include: typeof channelInclude }>;

/** Token tidak pernah dikirim ke klien. */
export const toChannel = (c: ChannelRow) => ({
  id: c.id,
  platform: c.platform,
  name: c.name,
  handle: c.handle,
  mode: c.mode,
  status: c.status,
  connected: !!c.access_token_enc,
  projects: c.projects.map((p) => p.project.slug),
  addedBy: uname(c.adder),
  added: iso(c.created_at),
});

export const scheduleInclude = { assignee: userRef, project: { select: { slug: true } } } satisfies Prisma.ContentScheduleInclude;
export type ScheduleRow = Prisma.ContentScheduleGetPayload<{ include: typeof scheduleInclude }>;

export const toSchedule = (s: ScheduleRow) => ({
  id: s.id,
  project: s.project.slug,
  title: s.title,
  format: s.format,
  channelIds: s.channel_ids,
  days: s.days,
  time: s.time,
  leadDays: s.lead_days,
  assigneeId: uname(s.assignee),
  checklist: s.checklist,
  active: s.active,
});
