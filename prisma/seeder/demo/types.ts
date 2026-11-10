export type MemberKind = "human" | "agent";

export interface Member {
  id: string;
  name: string;
  fullName: string;
  kind: MemberKind;
  role: string;
  team: string;
  /** Divisi perusahaan, mis. "engineering", "kreatif". */
  division: string;
  initials: string;
  /** Warna avatar manusia (agent selalu gradient ungu). */
  color?: string;
  email?: string;
  access: "Owner" | "Admin" | "Anggota" | "Tamu" | "Agent";
  status: "online" | "fokus" | "offline" | "bekerja" | "menunggu" | "idle";
  floor?: "l1" | "l2";
  joined: string;
}

export type AiProviderId = "anthropic" | "google" | "xai" | "openai" | "openrouter" | "compatible";

/** Koneksi workspace ke penyedia AI. Key asli disimpan terenkripsi di server; FE hanya tahu 4 karakter terakhir. */
export interface AiConnection {
  provider: AiProviderId;
  keyHint: string;
  baseUrl?: string;
  /** Id model yang tersedia (hasil uji koneksi). */
  models: string[];
  status: "terhubung" | "gagal";
  addedBy: string;
  added: string;
  lastTested?: string;
}

/**
 * Data kepegawaian & pribadi karyawan.
 * Kolom "publik" boleh dilihat semua anggota; sisanya hanya pemilik profil dan Owner.
 */
export interface EmployeeProfile {
  memberId: string;
  // Publik
  employeeId: string;
  managerId?: string;
  workLocation: "Kantor" | "Hybrid" | "Remote";
  office: string;
  startDate: string;
  /** Hanya tanggal & bulan yang tampil ke anggota lain. */
  birthDate?: string;
  // Pribadi (pemilik & Owner)
  employment: "Tetap" | "Kontrak" | "Magang" | "Freelance";
  contractEnd?: string;
  birthPlace?: string;
  gender?: "Laki-laki" | "Perempuan";
  phone?: string;
  personalEmail?: string;
  address?: string;
  nik?: string;
  npwp?: string;
  bpjsKesehatan?: string;
  bpjsKetenagakerjaan?: string;
  bank?: { name: string; account: string; holder: string };
  emergency?: { name: string; relation: string; phone: string };
}

export interface AgentProfile {
  id: string;
  /** Nama model yang tampil, mis. "Gemini 2.5 Pro". */
  model: string;
  /** Penyedia model. Kosong pada data lama = Anthropic. */
  provider?: AiProviderId;
  /** Id model di API penyedia, mis. "gemini-2.5-pro". */
  modelId?: string;
  description: string;
  skills: string[];
  budget: number;
  spent: number;
  tasksDone: number;
  avgMinutes: number;
  approvalRate: number;
  currentTask?: string;
  supervisorId: string;
  tools: { name: string; scope: string; mode: "baca" | "baca-tulis" | "persetujuan" | "nonaktif" }[];
  learnings: { title: string; body: string; source: string; date: string; pinned?: boolean }[];
  usage: number[]; // biaya per hari (ribu rupiah), 30 hari
}

export type Priority = "rendah" | "sedang" | "tinggi" | "mendesak";
export type ColumnId = "todo" | "progress" | "review" | "done";
export type TicketType = "story" | "task" | "bug" | "dokumen" | "desain" | "konten";

/** Satu status di alur kerja proyek. `category` dipakai untuk logika umum (selesai, progres). */
export interface WorkflowStatus {
  id: string;
  name: string;
  category: ColumnId;
  color: string;
  /** Batas jumlah tiket di kolom (WIP). */
  wip?: number;
}

export type ProjectTemplate = "software" | "kanban" | "kreatif" | "konten";

export interface Division {
  id: string;
  name: string;
  color: string;
  leadId: string;
  description: string;
  /** Jenis permintaan yang bisa diajukan divisi lain ke divisi ini. */
  requestKinds: string[];
}

export interface Attachment {
  name: string;
  size: string;
  kind: "gambar" | "pdf" | "dokumen" | "video" | "lainnya";
  by: string;
  time: string;
}

export interface PullRequest {
  number: number;
  title: string;
  status: "draft" | "open" | "merged" | "closed";
  ci: "lulus" | "gagal" | "berjalan";
  repo: string;
  authorId: string;
}

export interface TicketLink {
  type: "memblokir" | "diblokir" | "terkait" | "duplikat";
  key: string;
}

export interface WorkRequest {
  id: string;
  title: string;
  detail: string;
  /** Divisi tujuan. */
  division: string;
  kind: string;
  fromId: string;
  priority: Priority;
  due?: string;
  references: string[];
  attachments: Attachment[];
  status: "baru" | "ditinjau" | "diterima" | "ditolak" | "selesai";
  created: string;
  ticketKey?: string;
  project?: string;
  note?: string;
  /** Ringkasan otomatis dari agent. */
  agentSummary?: string;
}

export interface AgentNote {
  tone: "working" | "warning" | "error" | "approval";
  text: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  time: string;
}

export interface Ticket {
  id: string;
  key: string;
  project: string;
  title: string;
  description: string;
  type: TicketType;
  /** Kategori status (untuk logika umum). */
  column: ColumnId;
  /** Status di alur kerja proyek (id WorkflowStatus). */
  status: string;
  labels: string[];
  priority: Priority;
  assigneeId?: string;
  reporterId: string;
  epicId?: string;
  inSprint: boolean;
  points?: number;
  due?: string;
  checklist: { text: string; done: boolean }[];
  comments: Comment[];
  agentNote?: AgentNote;
  parentKey?: string;
  links?: TicketLink[];
  attachments?: Attachment[];
  watchers?: string[];
  dev?: { branch?: string; prs: PullRequest[]; commits?: number };
  /** Nama sprint tempat tiket diselesaikan (setelah sprint ditutup). */
  archivedSprint?: string;
  /** Asal tiket bila dibuat dari halaman Permintaan. */
  requestId?: string;
  /** Tiket konten: format & rencana publikasi per akun sosmed. */
  content?: { format: ContentFormat; posts: ContentPost[] };
  /** Dibuat otomatis dari jadwal konten rutin ini. */
  scheduleId?: string;
  created: string;
  updated: string;
}

export interface Project {
  slug: string;
  name: string;
  key: string;
  color: string;
  description: string;
  client: string;
  leadId: string;
  memberIds: string[];
  division: string;
  template: ProjectTemplate;
  workflow: WorkflowStatus[];
  status: "Berjalan" | "Perencanaan" | "Ditahan" | "Selesai";
  sprint: { name: string; start: string; end: string; goal: string };
  start: string;
  target: string;
  /** Waktu proyek dibuat (proyek baru dari aplikasi). */
  created?: string;
}

export interface Epic {
  id: string;
  project: string;
  name: string;
  color: string;
  start: number; // minggu ke- (0 = minggu 1 Okt 2026)
  weeks: number;
  progress: number;
  ownerId: string;
}

export interface Doc {
  id: string;
  project: string;
  title: string;
  kind: "BRD" | "SRS" | "Arsitektur" | "Rencana" | "Notulen" | "Panduan";
  authorId: string;
  reviewerId?: string;
  status: "Draf" | "Direview" | "Disetujui";
  version: string;
  updated: string;
  pages: number;
  sections: { heading: string; body: string }[];
}

export type SocialPlatform = "youtube" | "instagram" | "facebook" | "tiktok" | "linkedin" | "x";

/** Akun sosmed yang terhubung ke workspace. "manual" = tim memposting sendiri, Garap mengingatkan & mencatat. */
export interface SocialChannel {
  id: string;
  platform: SocialPlatform;
  name: string;
  handle: string;
  mode: "otomatis" | "manual";
  status: "terhubung" | "perlu-login-ulang";
  /** Proyek yang boleh memakai akun ini. */
  projects: string[];
  addedBy: string;
  added: string;
}

export type ContentFormat = "video" | "short" | "reels" | "carousel" | "foto" | "story" | "teks" | "thread" | "artikel";

export interface ContentMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/** Satu publikasi tiket konten ke satu akun sosmed. */
export interface ContentPost {
  id: string;
  channelId: string;
  /** Judul (YouTube) — opsional untuk platform lain. */
  title?: string;
  caption: string;
  scheduledAt?: string;
  status: "draf" | "menunggu" | "terjadwal" | "memproses" | "tayang" | "gagal";
  approvedBy?: string;
  publishedAt?: string;
  url?: string;
  error?: string;
  metrics?: ContentMetrics;
}

/** Konten rutin: setiap hari terpilih, Garap membuat tiket konten beberapa hari sebelumnya. */
export interface ContentSchedule {
  id: string;
  project: string;
  title: string;
  format: ContentFormat;
  channelIds: string[];
  /** 0 = Minggu … 6 = Sabtu */
  days: number[];
  /** Jam tayang WIB, "19:00". */
  time: string;
  /** Tiket dibuat H-n sebelum tayang. */
  leadDays: number;
  assigneeId?: string;
  checklist: string[];
  active: boolean;
}

export interface Approval {
  id: string;
  agentId: string;
  project: string;
  kind: "akses" | "pesan-klien" | "dokumen" | "biaya" | "publikasi";
  /** Untuk kind "publikasi": tiket & id ContentPost yang akan ditayangkan. */
  ticketKey?: string;
  postId?: string;
  title: string;
  detail: string;
  preview?: string;
  risk: "rendah" | "sedang" | "tinggi";
  created: string;
  status: "menunggu" | "disetujui" | "ditolak";
  decidedAt?: string;
}

export interface Notification {
  id: string;
  kind: "mention" | "assign" | "approval" | "agent" | "comment" | "status";
  actorId: string;
  text: string;
  target?: string;
  href: string;
  project?: string;
  time: string;
  read: boolean;
}

export interface Channel {
  id: string;
  name: string;
  kind: "channel" | "dm";
  topic: string;
  memberIds: string[];
  project?: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  text: string;
  time: string;
  day: string;
  card?: { kind: "doc" | "approval" | "ticket"; title: string; sub: string; href?: string };
}

export interface RunStep {
  t: string;
  kind: "pikir" | "tool" | "hasil" | "persetujuan" | "galat";
  title: string;
  detail?: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  project: string;
  ticketKey?: string;
  title: string;
  status: "berhasil" | "berjalan" | "gagal" | "menunggu";
  started: string;
  duration: string;
  tokensIn: number;
  tokensOut: number;
  cost: number; // rupiah
  steps: RunStep[];
}

export interface AuditEntry {
  id: string;
  time: string;
  actorId: string;
  action: string;
  target: string;
  category: "akses" | "agent" | "proyek" | "keamanan" | "tagihan";
  ip: string;
}
