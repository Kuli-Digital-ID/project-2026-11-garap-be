/** Nilai yang diizinkan untuk kolom bertipe teks (selaras dengan FE src/lib/types.ts). */
export const MEMBER_KINDS = ['human', 'agent'] as const;
export const MEMBER_STATUSES = ['online', 'fokus', 'offline', 'bekerja', 'menunggu', 'idle'] as const;
export const STATUS_CATEGORIES = ['todo', 'progress', 'review', 'done'] as const;
export const PROJECT_TEMPLATES = ['software', 'kanban', 'kreatif', 'konten'] as const;
export const PROJECT_STATUSES = ['Berjalan', 'Perencanaan', 'Ditahan', 'Selesai'] as const;
export const SPRINT_STATES = ['rencana', 'aktif', 'selesai'] as const;
export const TICKET_TYPES = ['story', 'task', 'bug', 'dokumen', 'desain', 'konten'] as const;
export const PRIORITIES = ['rendah', 'sedang', 'tinggi', 'mendesak'] as const;
export const LINK_TYPES = ['memblokir', 'diblokir', 'terkait', 'duplikat'] as const;
export const ATTACHMENT_KINDS = ['gambar', 'pdf', 'dokumen', 'video', 'lainnya'] as const;
export const REQUEST_STATUSES = ['baru', 'ditinjau', 'diterima', 'ditolak', 'selesai'] as const;
export const DOC_KINDS = ['BRD', 'SRS', 'Arsitektur', 'Rencana', 'Notulen', 'Panduan'] as const;
export const DOC_STATUSES = ['Draf', 'Direview', 'Disetujui'] as const;
export const APPROVAL_KINDS = ['akses', 'pesan-klien', 'dokumen', 'biaya', 'publikasi'] as const;
export const RISKS = ['rendah', 'sedang', 'tinggi'] as const;
export const AUDIT_CATEGORIES = ['akses', 'agent', 'proyek', 'keamanan', 'tagihan'] as const;

/** Alur kerja bawaan per template proyek (sama dengan FE workflowTemplates). */
export const WORKFLOW_TEMPLATES: Record<(typeof PROJECT_TEMPLATES)[number], { code: string; name: string; category: string; color: string; wip?: number }[]> = {
  software: [
    { code: 'todo', name: 'To Do', category: 'todo', color: '#8A8D9B' },
    { code: 'progress', name: 'In Progress', category: 'progress', color: '#F2A93B' },
    { code: 'review', name: 'Review', category: 'review', color: '#3B82F6' },
    { code: 'done', name: 'Done', category: 'done', color: '#22A06B' },
  ],
  kanban: [
    { code: 'todo', name: 'To Do', category: 'todo', color: '#8A8D9B' },
    { code: 'progress', name: 'Dikerjakan', category: 'progress', color: '#F2A93B' },
    { code: 'done', name: 'Selesai', category: 'done', color: '#22A06B' },
  ],
  kreatif: [
    { code: 'brief', name: 'Brief masuk', category: 'todo', color: '#8A8D9B' },
    { code: 'konsep', name: 'Konsep', category: 'progress', color: '#F2A93B' },
    { code: 'produksi', name: 'Produksi', category: 'progress', color: '#E07A5F', wip: 4 },
    { code: 'revisi', name: 'Review & revisi', category: 'review', color: '#3B82F6' },
    { code: 'disetujui', name: 'Disetujui', category: 'done', color: '#22A06B' },
  ],
  konten: [
    { code: 'ide', name: 'Ide', category: 'todo', color: '#8A8D9B' },
    { code: 'draf', name: 'Draf', category: 'progress', color: '#F2A93B' },
    { code: 'review', name: 'Review', category: 'review', color: '#3B82F6' },
    { code: 'terjadwal', name: 'Terjadwal', category: 'review', color: '#0EA5E9' },
    { code: 'tayang', name: 'Tayang', category: 'done', color: '#22A06B' },
  ],
};

export const AI_PROVIDERS = ['anthropic', 'google', 'xai', 'openai', 'openrouter', 'compatible'] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export const SOCIAL_PLATFORMS = ['youtube', 'instagram', 'facebook', 'tiktok', 'linkedin', 'x'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const CONTENT_FORMATS = ['video', 'short', 'reels', 'carousel', 'foto', 'story', 'teks', 'thread', 'artikel'] as const;
export const POST_STATUSES = ['draf', 'menunggu', 'terjadwal', 'memproses', 'tayang', 'gagal'] as const;
