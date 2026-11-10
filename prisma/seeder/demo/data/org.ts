import type { Division, ProjectTemplate, TicketType, WorkflowStatus, WorkRequest } from "../types";

export const divisions: Division[] = [
  { id: "engineering", name: "Engineering & Produk", color: "#5E6AD2", leadId: "laras", description: "Pengembangan aplikasi, QA, dan analisis produk.", requestKinds: ["Bug", "Fitur baru", "Akses/akun", "Data & laporan"] },
  { id: "kreatif", name: "Creative & Design", color: "#E07A5F", leadId: "intan", description: "Brand, desain grafis, UI/UX, ilustrasi, dan video.", requestKinds: ["Desain grafis", "Ilustrasi", "Video & motion", "Presentasi", "Ikon", "UI/UX"] },
  { id: "marketing", name: "Marketing & Konten", color: "#0EA5E9", leadId: "mega", description: "Konten media sosial, kampanye, dan copywriting.", requestKinds: ["Konten sosial media", "Artikel/blog", "Kampanye", "Copywriting"] },
  { id: "bisnis", name: "Bisnis & Klien", color: "#22A06B", leadId: "sari", description: "Penjualan, akun klien, dan dukungan pelanggan.", requestKinds: ["Proposal klien", "Penawaran harga", "Onboarding klien"] },
  { id: "manajemen", name: "Manajemen", color: "#8A8D9B", leadId: "bhagas", description: "Direksi, keuangan, dan operasional.", requestKinds: ["Persetujuan anggaran", "Rekrutmen", "Lainnya"] },
];

const S = (id: string, name: string, category: WorkflowStatus["category"], color: string, wip?: number): WorkflowStatus => ({ id, name, category, color, wip });

export const workflowTemplates: Record<ProjectTemplate, { label: string; desc: string; workflow: WorkflowStatus[]; types: TicketType[] }> = {
  software: {
    label: "Software · Scrum",
    desc: "Sprint, backlog, story & bug. Untuk tim pengembangan.",
    workflow: [S("todo", "To Do", "todo", "#8A8D9B"), S("progress", "In Progress", "progress", "#F2A93B"), S("review", "Review", "review", "#3B82F6"), S("done", "Done", "done", "#22A06B")],
    types: ["story", "task", "bug", "dokumen"],
  },
  kanban: {
    label: "Kanban sederhana",
    desc: "Tiga kolom tanpa sprint. Cocok untuk operasional & tim kecil.",
    workflow: [S("todo", "To Do", "todo", "#8A8D9B"), S("progress", "Dikerjakan", "progress", "#F2A93B"), S("done", "Selesai", "done", "#22A06B")],
    types: ["task", "bug", "dokumen"],
  },
  kreatif: {
    label: "Desain & kreatif",
    desc: "Brief → konsep → produksi → revisi. Untuk tim desain & video.",
    workflow: [S("brief", "Brief masuk", "todo", "#8A8D9B"), S("konsep", "Konsep", "progress", "#F2A93B"), S("produksi", "Produksi", "progress", "#E07A5F", 4), S("revisi", "Review & revisi", "review", "#3B82F6"), S("disetujui", "Disetujui", "done", "#22A06B")],
    types: ["desain", "task", "dokumen"],
  },
  konten: {
    label: "Konten & marketing",
    desc: "Ide → draf → review → terjadwal → tayang.",
    workflow: [S("ide", "Ide", "todo", "#8A8D9B"), S("draf", "Draf", "progress", "#F2A93B"), S("review", "Review", "review", "#3B82F6"), S("terjadwal", "Terjadwal", "review", "#0EA5E9"), S("tayang", "Tayang", "done", "#22A06B")],
    types: ["konten", "desain", "task"],
  },
};

/** Alur Pinarak: ada kolom QA dan batas WIP. */
export const pinarakWorkflow: WorkflowStatus[] = [S("todo", "To Do", "todo", "#8A8D9B"), S("progress", "In Progress", "progress", "#F2A93B", 6), S("review", "Code Review", "review", "#3B82F6", 4), S("qa", "QA", "review", "#8B5CF6", 3), S("done", "Done", "done", "#22A06B")];

export const requests: WorkRequest[] = [
  {
    id: "r1", title: "Ilustrasi empty state aplikasi Pinarak", division: "kreatif", kind: "Ilustrasi", fromId: "laras", priority: "sedang", due: "2026-11-10", status: "diterima", created: "2026-10-30T10:15", ticketKey: "KRV-4", project: "brand-q4",
    detail: "Butuh 4 ilustrasi untuk layar kosong: daftar tamu kosong, belum ada RSVP, belum ada ucapan, dan galeri kosong. Gaya mengikuti key visual Pinarak.", references: ["Figma › Pinarak › Empty states"], attachments: [],
  },
  {
    id: "r2", title: "Template deck presentasi untuk demo klien HRIS", division: "kreatif", kind: "Presentasi", fromId: "sari", priority: "tinggi", due: "2026-11-05", status: "baru", created: "2026-11-03T09:20",
    detail: "Demo ke direksi PT Sinar Abadi hari Kamis. Perlu template 12 slide dengan warna brand HRIS, slot screenshot aplikasi, dan halaman harga.", references: ["Drive › Klien › HRIS › Materi demo"], attachments: [{ name: "brief-demo-hris.pdf", size: "420 KB", kind: "pdf", by: "sari", time: "2026-11-03T09:20" }],
    agentSummary: "12 slide, tenggat Rabu sore (H-1 demo). Komponen: cover, masalah, solusi, 4 slide fitur dengan screenshot, harga, timeline, penutup. Bisa memakai ulang template deck Pinarak.",
  },
  {
    id: "r3", title: "Banner iklan Meta untuk peluncuran Pinarak (3 ukuran)", division: "kreatif", kind: "Desain grafis", fromId: "mega", priority: "tinggi", due: "2026-11-08", status: "ditinjau", created: "2026-11-02T14:05",
    detail: "Ukuran 1080×1080, 1080×1350, dan 1080×1920. Copy utama dari Dian, CTA “Buat undangan gratis”.", references: ["Copy kampanye › Dian"], attachments: [],
  },
  {
    id: "r4", title: "Warna tombol CTA landing page Pinarak tidak sesuai brand", division: "engineering", kind: "Bug", fromId: "intan", priority: "sedang", status: "baru", created: "2026-11-03T11:40",
    detail: "Tombol “Mulai gratis” memakai #4F46E5, seharusnya #5E6AD2 sesuai panduan brand v2. Terlihat di halaman harga dan beranda.", references: ["https://pinarak.id/harga"], attachments: [{ name: "screenshot-cta.png", size: "310 KB", kind: "gambar", by: "intan", time: "2026-11-03T11:40" }],
  },
  {
    id: "r5", title: "Artikel blog: cara Kuli Digital bekerja dengan agent AI", division: "marketing", kind: "Artikel/blog", fromId: "bhagas", priority: "rendah", due: "2026-11-20", status: "baru", created: "2026-11-02T20:10",
    detail: "Cerita di balik Garap: tim manusia + 9 agent, contoh alur persetujuan, dan pelajaran 6 bulan pertama. ±1.200 kata.", references: [], attachments: [],
  },
  {
    id: "r6", title: "Set ikon custom untuk menu aplikasi Ider", division: "kreatif", kind: "Ikon", fromId: "ayu", priority: "rendah", status: "ditolak", created: "2026-10-28T13:00", note: "Untuk MVP pakai Lucide dulu. Set ikon custom dijadwalkan Q1 2027.",
    detail: "24 ikon menu dengan gaya line 1.5px.", references: [], attachments: [],
  },
];
