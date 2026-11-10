import type { AgentRun, Approval, AuditEntry, Channel, Message, Notification } from "../types";

export const approvals: Approval[] = [
  {
    id: "a5", agentId: "kirana", project: "konten-sosmed", kind: "publikasi", risk: "sedang", status: "menunggu", created: "2026-11-10T08:20",
    ticketKey: "SOS-30", postId: "p30-li",
    title: "Tayangkan thread LinkedIn Kamis 12 Nov 10.00",
    detail: "Kirana menyiapkan thread untuk LinkedIn Kuli Digital. Akun ini mode manual: setelah disetujui, Reza diingatkan untuk memposting pada jamnya.",
    preview: "Kenapa kami mewajibkan persetujuan manusia untuk setiap pesan agent AI ke klien — dan apa yang terjadi setelah 3 bulan. 🧵\n\n1/ …",
  },
  {
    id: "a1", agentId: "nadia", project: "pinarak", kind: "dokumen", risk: "rendah", status: "menunggu", created: "2026-11-01T07:30",
    title: "Setujui rencana Sprint 4 Pinarak",
    detail: "15 tiket, 52 poin dari kapasitas 58. Nadia akan membagikan ke tim dan membuat jadwal rapat setelah disetujui.",
    preview: "Tujuan: pengguna bisa membuat undangan dari template, mengisi RSVP, dan membayar paket Premium.\nRisiko utama: BRD v2 belum final (PNR-149), sandbox iPaymu lambat (PNR-152).\nDemo: Jumat 7 Nov 14.00.",
  },
  {
    id: "a2", agentId: "raka", project: "pinarak", kind: "pesan-klien", risk: "sedang", status: "menunggu", created: "2026-11-01T08:58",
    title: "Kirim email ringkasan survei ke mitra WO",
    detail: "Raka ingin mengirim ringkasan hasil survei paket Premium ke 5 mitra wedding organizer dari akun sari@kulidigital.id.",
    preview: "Kepada: 5 mitra WO\nSubjek: Terima kasih & ringkasan survei Pinarak\n\nHalo Bapak/Ibu,\nTerima kasih sudah meluangkan waktu untuk wawancara minggu lalu. Berikut 3 temuan utama: (1) 72% calon pengantin punya tamu < 500 orang, (2) amplop digital jadi fitur paling diminta, (3) WO ingin dashboard untuk banyak klien…",
  },
  {
    id: "a3", agentId: "dewi", project: "pinarak", kind: "akses", risk: "tinggi", status: "menunggu", created: "2026-11-01T09:40",
    title: "Akses SSH ke server staging Pinarak",
    detail: "Dewi butuh akses tulis ke staging.pinarak.id selama 2 jam untuk memasang runner CI dan memperbarui variabel lingkungan.",
    preview: "Perintah yang akan dijalankan:\n• docker compose pull && docker compose up -d\n• systemctl restart gh-runner\n• Memperbarui IPAYMU_SANDBOX_KEY di .env.staging\nAkses dicabut otomatis pukul 11.40.",
  },
  {
    id: "a4", agentId: "sekar", project: "ider", kind: "pesan-klien", risk: "sedang", status: "menunggu", created: "2026-11-01T10:05",
    title: "Kirim WhatsApp konfirmasi format faktur ke CV Sumber Makmur",
    detail: "Sekar menyiapkan pesan untuk Bu Rina (finance klien) berisi 2 opsi format faktur.",
    preview: "Selamat siang Bu Rina, kami dari tim Ider. Untuk faktur di aplikasi sales, Ibu lebih memilih (A) faktur per order, atau (B) faktur gabungan per kunjungan? Contoh keduanya terlampir. Terima kasih 🙏",
  },
  { id: "a0a", agentId: "bima", project: "pinarak", kind: "akses", risk: "sedang", status: "disetujui", created: "2026-10-31T15:20", decidedAt: "2026-10-31T15:31", title: "Push branch feat/ipaymu-webhook ke GitHub", detail: "Kerangka controller webhook iPaymu." },
  { id: "a0b", agentId: "raka", project: "pinarak", kind: "pesan-klien", risk: "sedang", status: "ditolak", created: "2026-10-14T10:00", decidedAt: "2026-10-14T10:20", title: "Email 7 pertanyaan klarifikasi ke vendor", detail: "Ditolak: terlalu banyak pertanyaan, pilih 3 terpenting." },
  { id: "a0c", agentId: "nadia", project: "hris", kind: "pesan-klien", risk: "rendah", status: "disetujui", created: "2026-10-31T16:00", decidedAt: "2026-10-31T16:05", title: "Laporan mingguan ke Pak Budi", detail: "3 capaian, 2 risiko, 1 keputusan." },
  { id: "a0d", agentId: "bayu", project: "ider", kind: "biaya", risk: "rendah", status: "disetujui", created: "2026-10-30T09:00", decidedAt: "2026-10-30T09:12", title: "Tambah kuota Rp 20rb untuk uji regresi 1.4", detail: "128 skenario × 3 perangkat." },
  { id: "a0e", agentId: "dewi", project: "pinarak", kind: "akses", risk: "tinggi", status: "ditolak", created: "2026-10-25T21:10", decidedAt: "2026-10-26T08:00", title: "Deploy ke staging di luar jam kerja", detail: "Ditolak: sesuai aturan deploy 09.00–17.00." },
];

export const notifications: Notification[] = [
  { id: "n1", kind: "approval", actorId: "sekar", text: "meminta persetujuan untuk mengirim WhatsApp ke klien", target: "Konfirmasi format faktur", href: "/persetujuan", project: "ider", time: "2026-11-01T10:05", read: false },
  { id: "n2", kind: "approval", actorId: "dewi", text: "meminta akses SSH ke server staging", target: "staging.pinarak.id", href: "/persetujuan", project: "pinarak", time: "2026-11-01T09:40", read: false },
  { id: "n3", kind: "mention", actorId: "raka", text: "menyebutmu di komentar: “3 pertanyaan yang perlu keputusan @Bhagas”", target: "PNR-138", href: "/proyek/pinarak/tiket/PNR-138", project: "pinarak", time: "2026-11-01T08:55", read: false },
  { id: "n4", kind: "agent", actorId: "fajar", text: "selesai mereview Rancangan API dan memberi 1 catatan", target: "PNR-142", href: "/proyek/pinarak/tiket/PNR-142", project: "pinarak", time: "2026-11-01T08:40", read: false },
  { id: "n5", kind: "approval", actorId: "nadia", text: "meminta persetujuan rencana sprint", target: "Rencana Sprint 4", href: "/persetujuan", project: "pinarak", time: "2026-11-01T07:30", read: false },
  { id: "n6", kind: "comment", actorId: "bima", text: "membalas di tiket Dokumen requirement v1", target: "PNR-135", href: "/proyek/pinarak/tiket/PNR-135", project: "pinarak", time: "2026-10-31T17:02", read: true },
  { id: "n7", kind: "status", actorId: "ayu", text: "memindahkan tiket ke Review", target: "PNR-141", href: "/proyek/pinarak/tiket/PNR-141", project: "pinarak", time: "2026-10-31T10:40", read: true },
  { id: "n8", kind: "assign", actorId: "laras", text: "menugaskanmu ke", target: "PNR-147 Subdomain otomatis", href: "/proyek/pinarak/tiket/PNR-147", project: "pinarak", time: "2026-10-30T14:00", read: true },
  { id: "n9", kind: "agent", actorId: "bayu", text: "membuat tiket bug baru dari uji regresi", target: "IDR-44", href: "/proyek/ider/tiket/IDR-44", project: "ider", time: "2026-10-30T09:40", read: true },
  { id: "n10", kind: "comment", actorId: "pakbudi", text: "berkomentar di Alur persetujuan cuti", target: "HRS-89", href: "/proyek/hris/tiket/HRS-89", project: "hris", time: "2026-10-29T10:00", read: true },
  { id: "n11", kind: "agent", actorId: "nadia", text: "mengirim laporan mingguan HRIS ke klien (disetujui)", target: "Laporan minggu ke-10", href: "/proyek/hris/dokumen", project: "hris", time: "2026-10-31T16:05", read: true },
  { id: "n12", kind: "mention", actorId: "rizky", text: "menyebutmu di #engineering: “@Bhagas aman kalau Dewi deploy Senin pagi?”", href: "/percakapan?c=engineering", time: "2026-10-31T17:45", read: true },
];

export const channels: Channel[] = [
  { id: "umum", name: "umum", kind: "channel", topic: "Pengumuman & obrolan seluruh tim", memberIds: [] },
  { id: "pinarak", name: "pinarak", kind: "channel", topic: "Proyek Pinarak · Sprint 4", memberIds: [], project: "pinarak" },
  { id: "engineering", name: "engineering", kind: "channel", topic: "Arsitektur, deploy, code review", memberIds: [] },
  { id: "hris-klien", name: "hris-klien", kind: "channel", topic: "Koordinasi dengan PT Sinar Abadi (ada tamu)", memberIds: [], project: "hris" },
  { id: "dm-raka", name: "Raka", kind: "dm", topic: "Business Analyst", memberIds: ["bhagas", "raka"] },
  { id: "dm-nadia", name: "Nadia", kind: "dm", topic: "Project Manager", memberIds: ["bhagas", "nadia"] },
  { id: "dm-laras", name: "Laras", kind: "dm", topic: "Product Manager", memberIds: ["bhagas", "laras"] },
  { id: "dm-bima", name: "Bima", kind: "dm", topic: "Solution Architect", memberIds: ["bhagas", "bima"] },
];

let mid = 0;
const m = (channelId: string, authorId: string, day: string, time: string, text: string, card?: Message["card"]): Message => ({ id: `m${++mid}`, channelId, authorId, day, time, text, card });

export const messages: Message[] = [
  m("umum", "bhagas", "2026-10-31", "08:30", "Pagi semua! Reminder: demo Sprint 4 Pinarak Jumat depan jam 14.00. Klien HRIS juga ikut sesi singkat jam 15.00."),
  m("umum", "laras", "2026-10-31", "08:34", "Siap. Aku siapkan skenario demonya bareng Nadia."),
  m("umum", "nadia", "2026-10-31", "08:35", "Sudah saya masukkan ke kalender tim. Undangan ke Pak Budi menunggu persetujuan pengiriman email.", { kind: "approval", title: "Undangan demo ke klien HRIS", sub: "Disetujui Bhagas · 08.40" }),
  m("umum", "sari", "2026-10-31", "12:10", "Ada kue dari Pak Budi di pantry 🍰 terima kasih atas go-live absensi cabang Cikarang!"),
  m("umum", "dimas", "2026-10-31", "12:11", "Gaskeun 🏃"),
  m("umum", "bhagas", "2026-11-01", "09:00", "Selamat pagi. Hari ini fokus: keputusan paket Premium & akses staging untuk Dewi."),

  m("pinarak", "nadia", "2026-10-31", "09:30", "Ringkasan daily: 9 dari 15 tiket selesai atau di review. Blocker: PNR-149 menunggu BRD v2."),
  m("pinarak", "ayu", "2026-10-31", "09:32", "Editor drag & drop sudah bisa simpan otomatis. Lanjut undo/redo hari ini."),
  m("pinarak", "raka", "2026-10-31", "09:40", "Draf BRD v2 bagian Paket sudah ada. Ada 3 keputusan yang menunggu Bhagas.", { kind: "doc", title: "BRD Pinarak v2 — Paket & monetisasi", sub: "14 halaman · Direview Fajar", href: "/proyek/pinarak/dokumen/pnr-brd" }),
  m("pinarak", "fajar", "2026-10-31", "16:31", "Review Dokumen requirement v1 selesai: 2 inkonsistensi dengan ERD. Detail di tiket.", { kind: "ticket", title: "PNR-135 · Dokumen requirement v1", sub: "Review · Prioritas tinggi", href: "/proyek/pinarak/tiket/PNR-135" }),
  m("pinarak", "laras", "2026-11-01", "09:12", "@Raka tolong siapkan perbandingan harga Premium Rp 99rb vs Rp 149rb, sertakan asumsi konversinya ya."),
  m("pinarak", "raka", "2026-11-01", "09:13", "Baik, Laras. Saya tambahkan sebagai lampiran BRD v2, estimasi selesai 30 menit."),

  m("engineering", "bima", "2026-10-31", "15:40", "Kerangka webhook iPaymu sudah di branch `feat/ipaymu-webhook` (disetujui Bhagas). @Andi silakan lanjut."),
  m("engineering", "andi", "2026-10-31", "16:02", "Noted 👍"),
  m("engineering", "dewi", "2026-10-31", "17:30", "Runner CI staging perlu dipasang ulang karena versi Docker lama. Saya akan minta akses besok pagi."),
  m("engineering", "rizky", "2026-10-31", "17:45", "@Bhagas aman kalau Dewi deploy Senin pagi? Aku standby dari jam 9."),
  m("engineering", "bhagas", "2026-10-31", "18:02", "Aman, asal di jam kerja dan ada rollback plan."),
  m("engineering", "dewi", "2026-11-01", "09:40", "Permintaan akses staging sudah saya ajukan. Rollback: snapshot volume sebelum update.", { kind: "approval", title: "Akses SSH ke server staging Pinarak", sub: "Menunggu persetujuan · risiko tinggi", href: "/persetujuan" }),

  m("hris-klien", "pakbudi", "2026-10-29", "10:00", "Selamat pagi. Untuk manajer ke atas cukup 1 tingkat persetujuan cuti ya, langsung HRD."),
  m("hris-klien", "raka", "2026-10-29", "10:05", "Baik, Pak Budi. Sudah saya perbarui di BRD bagian 3.4 dan tiket HRS-89."),
  m("hris-klien", "sari", "2026-10-31", "14:00", "Pak, sesi onboarding admin HR kami jadwalkan Kamis 6 Nov pukul 10.00 ya. Sekar akan mengirim materinya H-1."),
  m("hris-klien", "pakbudi", "2026-10-31", "14:20", "Siap, terima kasih Bu Sari."),

  m("dm-raka", "raka", "2026-11-01", "08:56", "Halo Bhagas, ada 3 pertanyaan di PNR-138 yang perlu keputusanmu sebelum BRD v2 final:\n1. Amplop digital → Premium atau add-on?\n2. Batas tamu Premium 500 atau 1.000?\n3. Domain sendiri di Premium?"),
  m("dm-raka", "raka", "2026-11-01", "08:58", "Saya juga menyiapkan email ringkasan survei ke mitra WO. Menunggu persetujuanmu.", { kind: "approval", title: "Kirim email ringkasan survei ke mitra WO", sub: "Menunggu persetujuan", href: "/persetujuan" }),

  m("dm-nadia", "nadia", "2026-11-01", "07:31", "Rencana Sprint 4 siap untuk ditinjau. Ringkasnya: 52 poin, 2 risiko, demo Jumat 7 Nov.", { kind: "doc", title: "Rencana Sprint 4", sub: "4 halaman · menunggu persetujuan", href: "/proyek/pinarak/dokumen/pnr-sprint4" }),

  m("dm-laras", "laras", "2026-10-31", "19:05", "Mas, besok aku fokus dulu ya (blok kalender sampai 12.00). Kalau urgent DM aja."),
  m("dm-laras", "bhagas", "2026-10-31", "19:20", "Oke Ras 👍"),

  m("dm-bima", "bima", "2026-10-31", "17:06", "ERD v4 sudah disetujui Andi. Perubahan utama: tabel guest_groups.", { kind: "doc", title: "Arsitektur & ERD Pinarak", sub: "v4.0 · Disetujui", href: "/proyek/pinarak/dokumen/pnr-arch" }),
];

export const channelMembers: Record<string, string[]> = {
  umum: ["bhagas", "laras", "intan", "mega", "reza", "galih", "dian", "dimas", "ayu", "andi", "wulan", "rizky", "hendra", "sari", "raka", "nadia", "bima", "fajar", "dewi", "sinta", "sekar", "bayu", "tari"],
  pinarak: ["bhagas", "laras", "dimas", "ayu", "andi", "rizky", "hendra", "raka", "sinta", "fajar", "bima", "dewi", "nadia", "tari"],
  engineering: ["bhagas", "ayu", "andi", "wulan", "rizky", "bima", "dewi", "bayu"],
  "hris-klien": ["bhagas", "laras", "sari", "pakbudi", "raka", "sekar", "nadia"],
};

export const runs: AgentRun[] = [
  {
    id: "run-2041", agentId: "raka", project: "pinarak", ticketKey: "PNR-138", title: "Analisis brief paket Premium", status: "menunggu", started: "2026-11-01T08:20", duration: "38 mnt", tokensIn: 184200, tokensOut: 22600, cost: 6840,
    steps: [
      { t: "08.20", kind: "pikir", title: "Membaca tiket PNR-138 dan BRD v1", detail: "Tujuan: rekomendasi fitur & harga paket Premium." },
      { t: "08.21", kind: "tool", title: "google_drive.read · /Klien/Pinarak/survei-40-responden.xlsx", detail: "40 baris · 18 kolom" },
      { t: "08.24", kind: "tool", title: "google_drive.read · /Klien/Pinarak/wawancara-wo/*.docx", detail: "5 transkrip wawancara" },
      { t: "08.31", kind: "hasil", title: "Rekap: 72% tamu < 500 orang, amplop digital diminta 31 dari 40 responden" },
      { t: "08.40", kind: "tool", title: "garap.docs.update · BRD Pinarak v2 bagian 3", detail: "+1.240 kata" },
      { t: "08.52", kind: "pikir", title: "Tiga keputusan tidak bisa saya ambil sendiri", detail: "Harga & batas paket berdampak ke pendapatan — perlu Bhagas." },
      { t: "08.55", kind: "tool", title: "garap.tickets.comment · PNR-138", detail: "Menyebut @Bhagas dengan 3 pertanyaan" },
      { t: "08.58", kind: "persetujuan", title: "Meminta persetujuan: email ringkasan survei ke 5 mitra WO" },
    ],
  },
  {
    id: "run-2039", agentId: "fajar", project: "pinarak", ticketKey: "PNR-142", title: "Review Rancangan API modul undangan", status: "berhasil", started: "2026-11-01T08:10", duration: "29 mnt", tokensIn: 96400, tokensOut: 6100, cost: 2150,
    steps: [
      { t: "08.10", kind: "tool", title: "garap.docs.read · Rancangan API (OpenAPI 3.1)" },
      { t: "08.12", kind: "tool", title: "garap.docs.read · Arsitektur & ERD v4" },
      { t: "08.30", kind: "hasil", title: "1 temuan: istilah guest/tamu tidak konsisten di contoh respons" },
      { t: "08.40", kind: "tool", title: "garap.tickets.comment · PNR-142" },
    ],
  },
  {
    id: "run-2036", agentId: "bima", project: "pinarak", ticketKey: "PNR-142", title: "Menulis endpoint RSVP", status: "berjalan", started: "2026-11-01T09:05", duration: "1 j 25 mnt", tokensIn: 241000, tokensOut: 38400, cost: 9620,
    steps: [
      { t: "09.05", kind: "pikir", title: "Menyusun resource /rsvp/{token}", detail: "Token sekali pakai? Tidak — tamu boleh mengubah jawaban sampai H-1." },
      { t: "09.18", kind: "tool", title: "github.read · kuli-digital/pinarak-be/src/modules/guests" },
      { t: "09.44", kind: "tool", title: "garap.docs.update · Rancangan API · bagian RSVP" },
      { t: "10.12", kind: "pikir", title: "Menulis contoh respons galat 409 & 422" },
    ],
  },
  {
    id: "run-2033", agentId: "dewi", project: "pinarak", ticketKey: "PNR-129", title: "Pasang ulang runner CI staging", status: "menunggu", started: "2026-11-01T09:30", duration: "10 mnt", tokensIn: 21400, tokensOut: 1900, cost: 610,
    steps: [
      { t: "09.30", kind: "tool", title: "github_actions.list_runners · pinarak-be", detail: "runner-staging-01: offline sejak 31 Okt 17.12" },
      { t: "09.34", kind: "pikir", title: "Perlu akses tulis ke server", detail: "Sesuai aturan, akses server lewat persetujuan manusia." },
      { t: "09.40", kind: "persetujuan", title: "Meminta akses SSH 2 jam ke staging.pinarak.id" },
    ],
  },
  {
    id: "run-2030", agentId: "nadia", project: "pinarak", ticketKey: "PNR-134", title: "Menyusun rencana Sprint 4", status: "menunggu", started: "2026-11-01T06:50", duration: "40 mnt", tokensIn: 132000, tokensOut: 14800, cost: 4320,
    steps: [
      { t: "06.50", kind: "tool", title: "garap.tickets.list · Pinarak · backlog & sprint", detail: "24 tiket" },
      { t: "06.58", kind: "tool", title: "google_calendar.freebusy · tim Pinarak", detail: "Ayu cuti 6 Nov (½ hari)" },
      { t: "07.15", kind: "hasil", title: "Kapasitas 58 poin, rencana 52 poin" },
      { t: "07.30", kind: "persetujuan", title: "Meminta persetujuan rencana sprint" },
    ],
  },
  {
    id: "run-2027", agentId: "bayu", project: "ider", ticketKey: "IDR-47", title: "Uji regresi build 1.4", status: "berjalan", started: "2026-11-01T07:00", duration: "3 j 30 mnt", tokensIn: 88000, tokensOut: 12100, cost: 1480,
    steps: [
      { t: "07.00", kind: "tool", title: "playwright.run · suite regresi (128 skenario)" },
      { t: "08.45", kind: "hasil", title: "95 lulus · 0 gagal · 33 tersisa" },
    ],
  },
  {
    id: "run-2019", agentId: "bayu", project: "ider", ticketKey: "IDR-44", title: "Uji eksploratif kamera toko", status: "gagal", started: "2026-10-30T09:10", duration: "30 mnt", tokensIn: 40200, tokensOut: 3900, cost: 720,
    steps: [
      { t: "09.10", kind: "tool", title: "device.install · ider-1.4.0-rc2.apk · Samsung A14" },
      { t: "09.25", kind: "galat", title: "Aplikasi crash: OutOfMemoryError di ImageCompressor", detail: "Foto 12 MB dari kamera 50 MP" },
      { t: "09.40", kind: "tool", title: "garap.tickets.create · IDR-44 (bug)" },
    ],
  },
  {
    id: "run-2015", agentId: "raka", project: "hris", ticketKey: "HRS-95", title: "Komponen BPJS & PPh 21", status: "berjalan", started: "2026-11-01T09:20", duration: "1 j 10 mnt", tokensIn: 152000, tokensOut: 18900, cost: 5210,
    steps: [{ t: "09.20", kind: "tool", title: "web.search · tarif TER PPh 21 2026" }, { t: "09.30", kind: "tool", title: "garap.docs.update · BRD Modul penggajian" }],
  },
  {
    id: "run-2008", agentId: "sekar", project: "hris", ticketKey: "HRS-97", title: "Materi onboarding admin HR", status: "berhasil", started: "2026-10-31T13:00", duration: "52 mnt", tokensIn: 64000, tokensOut: 21000, cost: 1740,
    steps: [{ t: "13.00", kind: "tool", title: "garap.docs.read · BRD HRIS v1.4" }, { t: "13.40", kind: "hasil", title: "Slide 18 halaman + FAQ 24 pertanyaan" }],
  },
  {
    id: "run-2001", agentId: "sinta", project: "pinarak", ticketKey: "PNR-149", title: "Kerangka SRS RSVP", status: "berhasil", started: "2026-10-30T12:20", duration: "35 mnt", tokensIn: 71000, tokensOut: 9800, cost: 1260,
    steps: [{ t: "12.20", kind: "tool", title: "garap.docs.read · BRD v1" }, { t: "12.50", kind: "hasil", title: "Kerangka 6 bagian, menunggu BRD v2" }],
  },
  {
    id: "run-1994", agentId: "tari", project: "pinarak", title: "Draf Panduan API", status: "berhasil", started: "2026-10-30T14:10", duration: "48 mnt", tokensIn: 58000, tokensOut: 16400, cost: 1330,
    steps: [{ t: "14.10", kind: "tool", title: "github.read · openapi.yaml" }, { t: "14.55", kind: "hasil", title: "Panduan v0.3 · 6 halaman" }],
  },
];

export const audit: AuditEntry[] = [
  { id: "au1", time: "2026-11-01T10:05", actorId: "sekar", action: "mengajukan persetujuan pesan klien", target: "WhatsApp · CV Sumber Makmur", category: "agent", ip: "agent-runtime" },
  { id: "au2", time: "2026-11-01T09:40", actorId: "dewi", action: "meminta akses server", target: "staging.pinarak.id (SSH, 2 jam)", category: "akses", ip: "agent-runtime" },
  { id: "au3", time: "2026-11-01T09:01", actorId: "bhagas", action: "masuk", target: "Chrome · macOS", category: "keamanan", ip: "180.248.12.77" },
  { id: "au4", time: "2026-10-31T18:20", actorId: "bhagas", action: "mengubah batas biaya agent", target: "Bima: Rp 200rb → Rp 250rb", category: "tagihan", ip: "180.248.12.77" },
  { id: "au5", time: "2026-10-31T15:31", actorId: "bhagas", action: "menyetujui akses", target: "Bima · push ke GitHub feat/ipaymu-webhook", category: "akses", ip: "180.248.12.77" },
  { id: "au6", time: "2026-10-31T11:02", actorId: "laras", action: "menambahkan anggota proyek", target: "Rizky → Pinarak", category: "proyek", ip: "114.124.33.8" },
  { id: "au7", time: "2026-10-30T16:44", actorId: "bhagas", action: "menonaktifkan alat", target: "Bima · Database produksi", category: "akses", ip: "180.248.12.77" },
  { id: "au8", time: "2026-10-30T09:12", actorId: "hendra", action: "menyetujui tambahan kuota", target: "Bayu · Rp 20rb", category: "tagihan", ip: "36.72.218.4" },
  { id: "au9", time: "2026-10-29T13:30", actorId: "bhagas", action: "mengaktifkan 2FA wajib", target: "Seluruh workspace", category: "keamanan", ip: "180.248.12.77" },
  { id: "au10", time: "2026-10-28T08:00", actorId: "bhagas", action: "merekrut agent", target: "Tari · Technical Writer", category: "agent", ip: "180.248.12.77" },
  { id: "au11", time: "2026-10-26T08:00", actorId: "bhagas", action: "menolak akses", target: "Dewi · deploy di luar jam kerja", category: "akses", ip: "180.248.12.77" },
  { id: "au12", time: "2026-10-24T10:15", actorId: "laras", action: "mengundang tamu", target: "budi@sinarabadi.co.id → HRIS", category: "proyek", ip: "114.124.33.8" },
];

export const invoices = [
  { id: "INV-2026-10", period: "Oktober 2026", plan: "Tim · 10 kursi", seats: 1490000, ai: 884300, status: "Lunas", date: "2026-11-01" },
  { id: "INV-2026-09", period: "September 2026", plan: "Tim · 10 kursi", seats: 1490000, ai: 612800, status: "Lunas", date: "2026-10-01" },
  { id: "INV-2026-08", period: "Agustus 2026", plan: "Tim · 8 kursi", seats: 1192000, ai: 401500, status: "Lunas", date: "2026-09-01" },
];
