import { contentByTicket } from "./content";
import type { AgentNote, Attachment, ColumnId, Comment, Priority, Ticket, TicketLink, TicketType } from "../types";

interface Seed {
  n: number;
  title: string;
  col: ColumnId;
  /** Status alur kerja bila berbeda dari kategori. */
  st?: string;
  type?: TicketType;
  pr: Priority;
  who?: string;
  by?: string;
  labels: string[];
  pts?: number;
  epic?: string;
  backlog?: boolean;
  due?: string;
  desc?: string;
  check?: string;
  cm?: [string, string, string][];
  note?: AgentNote;
  created?: string;
  updated?: string;
  parent?: string;
  links?: TicketLink[];
  files?: Attachment[];
  dev?: Ticket["dev"];
  req?: string;
}

const checklist = (s?: string) =>
  (s ?? "")
    .split("|")
    .filter(Boolean)
    .map((l) => ({ done: l.startsWith("x "), text: l.slice(2) }));

const defaultDesc = (s: Seed) => {
  switch (s.type) {
    case "bug":
      return `**Langkah reproduksi**\n1. Buka halaman terkait di staging.\n2. Lakukan aksi pada judul tiket.\n3. Perhatikan hasilnya.\n\n**Yang terjadi**\n${s.title}.\n\n**Yang diharapkan**\nPerilaku sesuai SRS dan desain Figma.`;
    case "dokumen":
      return `Dokumen ini menjadi acuan tim untuk tahap berikutnya.\n\n**Isi minimal**\n- Latar belakang & tujuan\n- Ruang lingkup dan di luar lingkup\n- Asumsi dan risiko\n\nSetelah draf selesai, Fajar akan mereview sebelum dikirim ke manusia.`;
    case "konten":
      return `**Tujuan**\n${s.title}.\n\n**Brief**\n- Audiens: calon pengguna & klien Kuli Digital\n- Pesan utama: satu ide per konten, hook di 3 detik pertama\n- Suara brand: santai, jelas, tanpa kata "murah"\n\nCaption & jadwal per akun diatur di bagian **Publikasi**. Tayang setelah disetujui Mega.`;
    case "desain":
      return `**Brief**\n${s.title}.\n\n**Kebutuhan**\n- Ukuran & format sesuai kanal\n- Mengikuti key visual & brand guideline\n- File sumber diunggah ke lampiran`;
    default:
      return `**Konteks**\n${s.title}.\n\n**Kriteria penerimaan**\n- Sesuai desain di Figma\n- Teruji di staging oleh QA\n- Tidak ada regresi di modul terkait`;
  }
};

function build(project: string, key: string, seeds: Seed[]): Ticket[] {
  return seeds.map((s, i) => {
    const comments: Comment[] = (s.cm ?? []).map(([authorId, text, time], j) => ({ id: `${key}-${s.n}-c${j}`, authorId, text, time }));
    const created = s.created ?? `2026-10-${String(Math.max(1, 30 - i * 2)).padStart(2, "0")}T09:${String(10 + (i % 40)).padStart(2, "0")}`;
    return {
      id: `${key.toLowerCase()}-${s.n}`,
      key: `${key}-${s.n}`,
      project,
      title: s.title,
      description: s.desc ?? defaultDesc(s),
      type: s.type ?? "task",
      column: s.col,
      status: s.st ?? s.col,
      labels: s.labels,
      priority: s.pr,
      assigneeId: s.who,
      reporterId: s.by ?? "laras",
      epicId: s.epic,
      inSprint: !s.backlog,
      points: s.pts,
      due: s.due,
      checklist: checklist(s.check),
      comments,
      agentNote: s.note,
      parentKey: s.parent ? `${key}-${s.parent}` : undefined,
      links: s.links,
      attachments: s.files,
      dev: s.dev,
      requestId: s.req,
      created,
      updated: s.updated ?? comments[comments.length - 1]?.time ?? created,
    };
  });
}

const pinarak = build("pinarak", "PNR", [
  {
    n: 151, files: [{ name: "moodboard-template.png", size: "2,1 MB", kind: "gambar", by: "dimas", time: "2026-10-30T16:00" }], title: "Halaman pilih template undangan", col: "todo", type: "story", pr: "sedang", who: "dimas", labels: ["Frontend", "Design"], pts: 5, epic: "pnr-e2", due: "2026-11-05",
    desc: "Sebagai **calon pengantin**, saya ingin melihat galeri template undangan dan pratinjau langsung, supaya bisa memilih yang sesuai tema pernikahan.\n\n**Kriteria penerimaan**\n- Grid template dengan filter: Adat, Modern, Minimalis, Islami\n- Pratinjau di bingkai ponsel sebelum memilih\n- Template Premium diberi lencana dan mengarah ke halaman paket\n- Desain mengikuti frame *Pilih template* di Figma",
    check: "x Desain grid & filter di Figma|o Komponen kartu template|o Pratinjau bingkai ponsel|o Lencana Premium",
    cm: [["ayu", "Kartu template bisa pakai komponen Card yang sama dengan dashboard ya, Dim.", "2026-10-31T10:12"]],
  },
  {
    n: 152, dev: { branch: "feat/PNR-152-ipaymu-webhook", commits: 4, prs: [{ number: 52, title: "feat(payment): kerangka webhook iPaymu", status: "draft", ci: "berjalan", repo: "pinarak-be", authorId: "bima" }] }, links: [{ type: "terkait", key: "PNR-155" }], title: "Integrasi webhook pembayaran iPaymu", col: "todo", type: "task", pr: "tinggi", who: "andi", by: "bima", labels: ["Backend"], pts: 8, epic: "pnr-e4", due: "2026-11-06",
    desc: "Terima notifikasi pembayaran dari iPaymu untuk paket Premium & Eksklusif.\n\n**Catatan dari Bima**\n- Endpoint `POST /webhooks/ipaymu` wajib idempoten (simpan `reference_id`)\n- Validasi signature HMAC-SHA256\n- Status: `pending → paid → expired`\n- Kirim email konfirmasi via antrean, bukan sinkron",
    check: "o Endpoint & validasi signature|o Tabel payment_events|o Idempotensi reference_id|o Uji dengan sandbox iPaymu",
    cm: [
      ["bima", "Kerangka controller dan DTO sudah saya push ke branch `feat/ipaymu-webhook`. Silakan dilanjutkan, Andi.", "2026-10-31T15:40"],
      ["andi", "Siap, mulai Senin pagi.", "2026-10-31T16:02"],
    ],
  },
  {
    n: 149, links: [{ type: "diblokir", key: "PNR-138" }], title: "Spesifikasi fitur RSVP & buku tamu", col: "todo", type: "dokumen", pr: "sedang", who: "sinta", labels: ["Dokumen"], pts: 3, epic: "pnr-e3",
    note: { tone: "working", text: "Sinta menunggu BRD v2 final sebelum mulai" },
    cm: [
      ["sinta", "Saya akan mulai begitu BRD v2 disetujui. Draf kerangka SRS RSVP sudah siap.", "2026-10-30T13:00"],
      ["laras", "Oke. Pastikan ada skenario tamu tanpa nomor HP.", "2026-10-30T13:30"],
    ],
  },
  { n: 147, title: "Subdomain otomatis via Cloudflare Worker", col: "todo", pr: "rendah", who: "bhagas", due: "2026-11-07", by: "bima", labels: ["Infra"], pts: 3, epic: "pnr-e1", desc: "Setiap undangan mendapat subdomain `nama-pasangan.pinarak.id`.\n\n- Worker membaca slug dari KV\n- Fallback ke halaman 404 bermerek\n- Sertifikat wildcard sudah ada" },
  {
    n: 162, title: "Putuskan harga & isi paket Premium", col: "progress", type: "task", pr: "mendesak", who: "bhagas", by: "raka", labels: ["Klien"], pts: 1, epic: "pnr-e4", due: "2026-11-02",
    desc: "Keputusan bisnis yang dibutuhkan sebelum BRD v2 final (lihat PNR-138).\n\n- Harga Premium: Rp 99rb atau Rp 149rb\n- Batas tamu: 500 atau 1.000\n- Amplop digital: Premium atau add-on\n- Domain sendiri: Eksklusif saja?",
    check: "x Baca rekap survei Raka|o Diskusi dengan Laras|o Tulis keputusan di PNR-138",
    cm: [["raka", "Saya sudah lampirkan perbandingan konversi untuk kedua opsi harga di BRD v2 bagian 3.", "2026-11-01T09:45"]],
  },
  { n: 163, parent: "140", title: "Undo/redo minimal 20 langkah", col: "todo", type: "task", pr: "sedang", who: "ayu", labels: ["Frontend"], pts: 2, epic: "pnr-e2" },
  { n: 164, parent: "140", title: "Pratinjau desktop di editor", col: "progress", type: "task", pr: "sedang", who: "rizky", labels: ["Frontend"], pts: 2, epic: "pnr-e2" },
  { n: 165, parent: "140", title: "Blok Amplop digital (QRIS)", col: "todo", type: "task", pr: "rendah", labels: ["Frontend"], pts: 3, epic: "pnr-e2", backlog: true },
  { n: 153, title: "Musik latar undangan dengan tombol putar", col: "todo", type: "story", pr: "rendah", who: "ayu", labels: ["Frontend"], pts: 2, epic: "pnr-e2" },
  {
    n: 142, dev: { branch: "docs/PNR-142-openapi-undangan", commits: 9, prs: [{ number: 50, title: "docs(api): kontrak OpenAPI modul undangan", status: "open", ci: "gagal", repo: "pinarak-be", authorId: "bima" }] }, title: "Rancangan API modul undangan", col: "progress", type: "dokumen", pr: "tinggi", who: "bima", labels: ["Dokumen", "Backend"], pts: 5, epic: "pnr-e2", due: "2026-11-03",
    desc: "Kontrak OpenAPI untuk modul undangan: CRUD undangan, tamu, RSVP, dan ucapan.\n\n**Endpoint**\n- `GET/POST /invitations`\n- `GET/PATCH /invitations/{id}`\n- `POST /invitations/{id}/guests/import` (CSV)\n- `POST /rsvp/{token}`\n- `GET /invitations/{id}/wishes`",
    check: "x Resource undangan|x Resource tamu|x Import CSV|x Autentikasi token RSVP|o Ucapan & moderasi|o Contoh respons galat",
    note: { tone: "working", text: "Bima sedang menulis endpoint RSVP…" },
    cm: [
      ["andi", "Import CSV maksimal berapa baris?", "2026-10-30T11:05"],
      ["bima", "5.000 baris per unggahan, diproses di antrean. Di atas itu minta paket Eksklusif.", "2026-10-30T11:07"],
      ["laras", "Setuju. Masukkan ke catatan batasan paket juga ya.", "2026-10-30T11:20"],
      ["bima", "Sudah ditambahkan di bagian Batasan.", "2026-10-30T11:24"],
      ["fajar", "Catatan review: istilah `guest` dan `tamu` dipakai bergantian di contoh respons. Saya sarankan konsisten `guest` di API.", "2026-11-01T08:40"],
    ],
  },
  {
    n: 140, dev: { branch: "feat/PNR-140-editor-blok", commits: 17, prs: [{ number: 51, title: "feat(editor): drag & drop blok + simpan otomatis", status: "open", ci: "lulus", repo: "pinarak-fe", authorId: "ayu" }] }, title: "Editor drag & drop blok undangan", col: "progress", type: "story", pr: "tinggi", who: "ayu", labels: ["Frontend"], pts: 8, epic: "pnr-e2", due: "2026-11-07",
    desc: "Editor berbasis blok: Sampul, Mempelai, Acara, Galeri, Peta, RSVP, Amplop digital.\n\n**Kriteria penerimaan**\n- Blok bisa diurutkan dengan drag & drop\n- Simpan otomatis tiap 3 detik\n- Undo/redo minimal 20 langkah\n- Pratinjau mobile & desktop",
    check: "x Kerangka editor & panel blok|x Drag & drop urutan|x Simpan otomatis|o Undo/redo|o Pratinjau desktop|o Blok Amplop digital",
    cm: [
      ["dimas", "Spesifikasi spacing antar blok sudah saya tambahkan di Figma (16/24/32).", "2026-10-29T14:10"],
      ["ayu", "Mantap, makasih Dim!", "2026-10-29T14:15"],
    ],
  },
  {
    n: 138, links: [{ type: "memblokir", key: "PNR-149" }, { type: "memblokir", key: "PNR-162" }], files: [{ name: "rekap-survei-40-responden.xlsx", size: "86 KB", kind: "dokumen", by: "raka", time: "2026-11-01T08:31" }], title: "Analisis brief klien: paket Premium", col: "progress", type: "dokumen", pr: "mendesak", who: "raka", by: "bhagas", labels: ["Dokumen"], pts: 3, epic: "pnr-e4", due: "2026-11-02",
    desc: "Rangkum kebutuhan paket Premium dari hasil survei 40 calon pengguna dan wawancara 5 vendor wedding organizer.\n\n**Output**\n- Daftar fitur Premium vs Basic\n- Rekomendasi harga\n- Pertanyaan terbuka untuk Bhagas",
    check: "x Rekap survei|x Rekap wawancara WO|x Perbandingan kompetitor|o Rekomendasi harga",
    note: { tone: "warning", text: "Butuh input kamu: 3 pertanyaan klarifikasi" },
    cm: [
      ["raka", "Ada 3 pertanyaan yang perlu keputusan @Bhagas:\n1. Apakah amplop digital termasuk Premium atau add-on?\n2. Batas tamu Premium 500 atau 1.000?\n3. Boleh pakai domain sendiri di Premium?", "2026-11-01T08:55"],
      ["laras", "Untuk nomor 2, data survei condong ke 500 kan, Raka?", "2026-11-01T09:10"],
      ["raka", "Betul, 72% responden punya tamu di bawah 500. Tapi 3 dari 5 WO minta 1.000.", "2026-11-01T09:11"],
    ],
  },
  { n: 144, title: "Komponen peta lokasi acara (Google Maps embed)", col: "progress", type: "task", pr: "sedang", who: "rizky", labels: ["Frontend"], pts: 3, epic: "pnr-e2", check: "x Embed peta|x Tombol buka di Maps|o Mode gelap" },
  {
    n: 135, title: "Dokumen requirement v1", col: "review", type: "dokumen", pr: "tinggi", who: "fajar", by: "raka", labels: ["Dokumen"], pts: 5, epic: "pnr-e3",
    note: { tone: "error", text: "Fajar menemukan 2 inkonsistensi dengan rancangan data" },
    cm: [
      ["fajar", "Temuan review:\n1. Entitas **Tamu** di SRS punya field `grup`, tapi tidak ada di ERD v3.\n2. Status RSVP di bagian 4.2 menyebut “Mungkin”, padahal ERD hanya Hadir/Tidak hadir/Ragu.", "2026-10-31T16:30"],
      ["bima", "Nomor 1 saya tambahkan ke ERD v4. Nomor 2 ikuti ERD.", "2026-10-31T17:02"],
      ["raka", "Revisi bagian 4.2 sedang saya kerjakan.", "2026-11-01T08:15"],
    ],
  },
  {
    n: 134, title: "Rencana sprint & estimasi Pinarak", col: "review", type: "dokumen", pr: "sedang", who: "nadia", by: "bhagas", labels: ["Dokumen"], pts: 2,
    check: "x Kapasitas tim|x Daftar tiket|x Estimasi poin|x Risiko|x Target demo|x Jadwal rapat",
    note: { tone: "approval", text: "Menunggu persetujuanmu" },
    cm: [["nadia", "Rencana Sprint 4 siap: 15 tiket, 52 poin. Kapasitas tim 58 poin. Menunggu persetujuan Bhagas sebelum dibagikan.", "2026-11-01T07:30"]],
  },
  { n: 141, st: "qa", dev: { branch: "fix/PNR-141-rsvp-safari", commits: 2, prs: [{ number: 48, title: "fix(rsvp): tombol tertutup pseudo-element galeri", status: "merged", ci: "lulus", repo: "pinarak-fe", authorId: "ayu" }] }, files: [{ name: "rekaman-safari-ios17.mp4", size: "8,4 MB", kind: "video", by: "bayu", time: "2026-10-30T15:22" }], title: "Tombol RSVP tidak responsif di Safari iOS 17", col: "review", type: "bug", pr: "tinggi", who: "ayu", by: "bayu", labels: ["Frontend", "Bug"], pts: 2, epic: "pnr-e3", cm: [["bayu", "Terjadi di iPhone 12, iOS 17.6. Tombol tertutup elemen `::after` dari blok galeri. Rekaman layar terlampir.", "2026-10-30T15:22"], ["ayu", "Sudah di-fix di PR #48, minta tolong uji ulang ya Bayu.", "2026-10-31T10:40"]] },
  { n: 129, dev: { branch: "chore/PNR-129-ci", commits: 6, prs: [{ number: 12, title: "chore(ci): lint, test, dan deploy preview", status: "merged", ci: "lulus", repo: "pinarak-be", authorId: "dewi" }] }, title: "Setup repo & pipeline CI", col: "done", pr: "sedang", who: "dewi", by: "bima", labels: ["Infra"], pts: 3, epic: "pnr-e1", check: "x Repo FE & BE|x Lint & test di PR|x Deploy preview|x Notifikasi ke #engineering" },
  { n: 127, title: "Skema database awal", col: "done", type: "dokumen", pr: "tinggi", who: "bima", labels: ["Backend"], pts: 5, epic: "pnr-e1", cm: [["andi", "Nomor HP sebaiknya disimpan E.164.", "2026-10-17T10:00"], ["bima", "Disetujui, sudah diperbarui.", "2026-10-17T10:30"]] },
  { n: 125, title: "Wireframe alur pembuatan undangan", col: "done", type: "story", pr: "sedang", who: "dimas", labels: ["Design"], pts: 3, epic: "pnr-e2" },
  { n: 131, title: "Halaman login & daftar dengan Google", col: "done", type: "story", pr: "sedang", who: "ayu", labels: ["Frontend"], pts: 3, epic: "pnr-e1" },
  { n: 132, title: "Autentikasi JWT & refresh token", col: "done", pr: "tinggi", who: "andi", labels: ["Backend"], pts: 5, epic: "pnr-e1" },

  { n: 155, title: "Amplop digital via QRIS", col: "todo", type: "story", pr: "sedang", labels: ["Backend", "Frontend"], pts: 8, epic: "pnr-e4", backlog: true, by: "raka" },
  { n: 156, title: "Ekspor daftar tamu ke Excel", col: "todo", type: "story", pr: "rendah", labels: ["Backend"], pts: 2, epic: "pnr-e3", backlog: true },
  { n: 157, title: "Moderasi ucapan tamu", col: "todo", type: "story", pr: "sedang", labels: ["Backend", "Frontend"], pts: 5, epic: "pnr-e3", backlog: true, by: "sinta" },
  { n: 158, title: "Landing page Pinarak & halaman harga", col: "todo", type: "story", pr: "tinggi", labels: ["Design", "Frontend"], pts: 5, epic: "pnr-e5", backlog: true, by: "bhagas" },
  { n: 159, title: "Panduan pengguna: membuat undangan pertama", col: "todo", type: "dokumen", pr: "rendah", who: "tari", labels: ["Dokumen"], pts: 2, epic: "pnr-e5", backlog: true },
  { n: 160, title: "Uji beban 1.000 RSVP serentak", col: "todo", pr: "sedang", who: "bayu", labels: ["Infra"], pts: 3, epic: "pnr-e5", backlog: true, by: "bima" },
  { n: 161, title: "Countdown hari-H di sampul undangan", col: "todo", type: "story", pr: "rendah", labels: ["Frontend"], pts: 1, epic: "pnr-e2", backlog: true },
]);

const ider = build("ider", "IDR", [
  { n: 41, title: "Check-in toko dengan validasi radius GPS 100 m", col: "progress", type: "story", pr: "tinggi", who: "wulan", by: "rizky", labels: ["Mobile"], pts: 5, epic: "idr-e1", due: "2026-11-03", check: "x Izin lokasi|x Hitung jarak haversine|o Mode lokasi palsu terdeteksi|o Foto toko wajib", cm: [["wulan", "Deteksi mock location di Android 14 perlu API baru, estimasi +1 hari.", "2026-10-31T11:00"], ["rizky", "Oke, catat di risiko sprint.", "2026-10-31T11:12"]] },
  { n: 42, dev: { branch: "feat/IDR-42-offline-order", commits: 11, prs: [{ number: 19, title: "feat(sync): antrean outbox SQLite", status: "draft", ci: "berjalan", repo: "ider-mobile", authorId: "rizky" }] }, title: "Order offline tersimpan di SQLite dan tersinkron", col: "progress", type: "story", pr: "mendesak", who: "rizky", labels: ["Mobile", "Backend"], pts: 8, epic: "idr-e2", due: "2026-11-03", check: "x Skema lokal|x Antrean sinkron|o Resolusi konflik stok|o Uji tanpa sinyal 24 jam", note: { tone: "working", text: "Bima meninjau strategi resolusi konflik" } },
  { n: 43, title: "Daftar rute kunjungan harian sales", col: "review", type: "story", pr: "sedang", who: "wulan", labels: ["Mobile"], pts: 3, epic: "idr-e1" },
  { n: 44, title: "Aplikasi crash saat foto toko > 8 MB", col: "review", type: "bug", pr: "tinggi", who: "wulan", by: "bayu", labels: ["Mobile", "Bug"], pts: 2, epic: "idr-e1", cm: [["bayu", "Reproduksi 5/5 di Samsung A14. Log: OutOfMemoryError di ImageCompressor.", "2026-10-30T09:40"]] },
  { n: 45, title: "API katalog produk & harga per wilayah", col: "done", pr: "tinggi", who: "andi", labels: ["Backend"], pts: 5, epic: "idr-e2" },
  { n: 46, title: "Login sales dengan PIN 6 digit", col: "done", type: "story", pr: "sedang", who: "wulan", labels: ["Mobile"], pts: 3, epic: "idr-e1" },
  { n: 47, title: "Uji regresi build 1.4", col: "progress", pr: "sedang", who: "bayu", by: "hendra", labels: ["QA"], pts: 2, note: { tone: "working", text: "Bayu menjalankan 128 skenario · 74%" } },
  { n: 48, title: "Ringkasan penjualan harian per sales", col: "todo", type: "story", pr: "sedang", who: "andi", labels: ["Backend"], pts: 3, epic: "idr-e3" },
  { n: 49, title: "Notifikasi target bulanan tercapai", col: "todo", type: "story", pr: "rendah", who: "wulan", labels: ["Mobile"], pts: 2, epic: "idr-e3" },
  { n: 50, title: "Konfirmasi format faktur dengan klien", col: "todo", type: "task", pr: "sedang", who: "sari", labels: ["Klien"], pts: 1, note: { tone: "approval", text: "Draf email Sekar menunggu persetujuan" } },
  { n: 51, title: "Peta sebaran toko di dashboard supervisor", col: "todo", type: "story", pr: "sedang", labels: ["Frontend"], pts: 5, epic: "idr-e3", backlog: true },
  { n: 52, title: "Retur barang dari toko", col: "todo", type: "story", pr: "sedang", labels: ["Mobile", "Backend"], pts: 8, epic: "idr-e2", backlog: true },
  { n: 53, title: "Integrasi printer thermal Bluetooth", col: "todo", type: "story", pr: "rendah", labels: ["Mobile"], pts: 5, epic: "idr-e2", backlog: true },
]);

const hris = build("hris", "HRS", [
  { n: 88, title: "Form pengajuan cuti dengan saldo otomatis", col: "progress", type: "story", pr: "tinggi", who: "andi", labels: ["Backend", "Frontend"], pts: 5, epic: "hrs-e2", due: "2026-11-04", check: "x Hitung saldo cuti tahunan|x Validasi tanggal bentrok|o Lampiran surat dokter|o Notifikasi atasan" },
  { n: 89, title: "Alur persetujuan cuti 2 tingkat", col: "progress", type: "story", pr: "tinggi", who: "andi", by: "pakbudi", labels: ["Backend"], pts: 5, epic: "hrs-e2", cm: [["pakbudi", "Untuk level manajer ke atas cukup 1 tingkat (langsung HRD).", "2026-10-29T10:00"], ["raka", "Dicatat, Pak. Saya perbarui BRD bagian 3.4.", "2026-10-29T10:05"]] },
  { n: 90, title: "Kalender cuti bersama 2027", col: "todo", type: "task", pr: "sedang", who: "sinta", labels: ["Dokumen"], pts: 1, epic: "hrs-e2" },
  { n: 91, dev: { branch: "fix/HRS-91-face-lowlight", commits: 3, prs: [{ number: 33, title: "fix(face): auto-exposure & flash layar", status: "open", ci: "lulus", repo: "hris-mobile", authorId: "wulan" }] }, title: "Absensi wajah gagal di cahaya redup", col: "review", type: "bug", pr: "mendesak", who: "wulan", by: "hendra", labels: ["Mobile", "Bug"], pts: 3, epic: "hrs-e1", cm: [["hendra", "Terjadi di gudang Cikarang shift malam. Skor kemiripan turun ke 0,61.", "2026-10-30T20:10"], ["wulan", "Ditambahkan auto-exposure dan flash layar. Build 0.9.3 siap diuji.", "2026-10-31T14:00"]] },
  { n: 92, title: "Geofence kantor cabang (12 lokasi)", col: "done", type: "story", pr: "tinggi", who: "wulan", labels: ["Mobile"], pts: 5, epic: "hrs-e1" },
  { n: 93, title: "Rekap absensi bulanan untuk HRD", col: "review", type: "story", pr: "sedang", who: "andi", labels: ["Backend"], pts: 3, epic: "hrs-e1" },
  { n: 94, title: "Pengajuan lembur & perhitungan upah lembur", col: "todo", type: "story", pr: "tinggi", who: "andi", labels: ["Backend"], pts: 8, epic: "hrs-e2", due: "2026-11-08" },
  { n: 95, title: "BRD modul penggajian", col: "progress", type: "dokumen", pr: "tinggi", who: "raka", labels: ["Dokumen"], pts: 3, epic: "hrs-e3", note: { tone: "working", text: "Raka menyusun komponen BPJS & PPh 21" } },
  { n: 96, title: "Desain slip gaji PDF", col: "todo", type: "story", pr: "sedang", who: "dimas", labels: ["Design"], pts: 2, epic: "hrs-e3" },
  { n: 100, title: "Tanda tangan addendum kontrak (modul penggajian)", col: "todo", type: "task", pr: "tinggi", who: "bhagas", by: "sari", labels: ["Klien"], pts: 1, due: "2026-11-04", desc: "Addendum menambah modul penggajian senilai Rp 85 jt dengan target Desember. Draf dari legal klien sudah diterima Sari.", cm: [["sari", "Draf addendum dari legal PT Sinar Abadi sudah aku upload ke Drive /Klien/HRIS. Mohon dicek pasal 4 soal SLA ya Mas.", "2026-10-31T15:10"]] },
  { n: 97, title: "Materi onboarding admin HR", col: "progress", type: "dokumen", pr: "sedang", who: "sekar", by: "sari", labels: ["Dokumen", "Klien"], pts: 2, epic: "hrs-e4" },
  { n: 86, title: "Login karyawan dengan NIK", col: "done", type: "story", pr: "sedang", who: "wulan", labels: ["Mobile"], pts: 3, epic: "hrs-e1" },
  { n: 87, title: "Struktur organisasi & jabatan", col: "done", pr: "sedang", who: "andi", labels: ["Backend"], pts: 3, epic: "hrs-e1" },
  { n: 98, title: "Integrasi e-SPT PPh 21", col: "todo", type: "story", pr: "sedang", labels: ["Backend"], pts: 8, epic: "hrs-e3", backlog: true },
  { n: 99, title: "Pinjaman karyawan & potongan gaji", col: "todo", type: "story", pr: "rendah", labels: ["Backend"], pts: 5, epic: "hrs-e3", backlog: true },
]);

const dolan = build("dolan", "DLN", [
  { n: 7, title: "BRD marketplace tiket wisata", col: "review", type: "dokumen", pr: "tinggi", who: "raka", by: "bhagas", labels: ["Dokumen"], pts: 5, epic: "dln-e1", note: { tone: "working", text: "Fajar mereview · 40%" } },
  { n: 8, title: "Riset kompetitor: 6 platform tiket wisata", col: "done", type: "dokumen", pr: "sedang", who: "raka", labels: ["Dokumen"], pts: 2, epic: "dln-e1" },
  { n: 9, title: "Wawancara 3 pengelola destinasi", col: "progress", type: "task", pr: "sedang", who: "sari", labels: ["Klien"], pts: 3, epic: "dln-e1", check: "x Goa Pindul|o Hutan Pinus Mangunan|o Tebing Breksi" },
  { n: 10, title: "User flow pemesanan tiket", col: "progress", type: "story", pr: "tinggi", who: "dimas", labels: ["Design"], pts: 5, epic: "dln-e2" },
  { n: 11, title: "Moodboard & arah visual", col: "done", type: "task", pr: "sedang", who: "dimas", labels: ["Design"], pts: 2, epic: "dln-e2" },
  { n: 12, title: "Usulan arsitektur & estimasi biaya cloud", col: "todo", type: "dokumen", pr: "sedang", who: "bima", labels: ["Dokumen", "Infra"], pts: 3, epic: "dln-e3" },
  { n: 13, title: "Proposal timeline & termin pembayaran", col: "todo", type: "dokumen", pr: "tinggi", who: "nadia", by: "bhagas", labels: ["Dokumen", "Klien"], pts: 2 },
  { n: 16, title: "Review proposal & termin pembayaran sebelum dikirim", col: "todo", type: "task", pr: "sedang", who: "bhagas", by: "nadia", labels: ["Klien"], pts: 1, due: "2026-11-05" },
  { n: 14, title: "Katalog destinasi & paket tur", col: "todo", type: "story", pr: "sedang", labels: ["Frontend", "Backend"], pts: 8, epic: "dln-e3", backlog: true },
  { n: 15, title: "Checkout & e-tiket QR", col: "todo", type: "story", pr: "tinggi", labels: ["Frontend", "Backend"], pts: 8, epic: "dln-e3", backlog: true },
]);

const kreatif = build("brand-q4", "KRV", [
  { n: 1, title: "Key visual peluncuran Pinarak", col: "progress", st: "konsep", type: "desain", pr: "tinggi", who: "intan", by: "mega", labels: ["Brand"], pts: 5, due: "2026-11-06", check: "x Moodboard|x 3 arah konsep|o Pilih 1 arah bersama Bhagas|o Final KV + turunan", desc: "Key visual utama untuk semua aset peluncuran 16 Nov.\n\n**Arah**\n- Hangat, Jawa modern, tidak klise\n- Warna utama #5E6AD2 + aksen emas\n- Harus terbaca di ukuran story", cm: [["mega", "Arah konsep 2 (batik geometris) paling cocok untuk iklan Meta.", "2026-11-02T15:10"], ["intan", "Setuju, aku matangkan arah 2 hari ini.", "2026-11-02T15:30"]] },
  { n: 2, title: "Banner Instagram feed & story (12 aset)", col: "progress", st: "produksi", type: "desain", pr: "tinggi", who: "dimas", by: "intan", labels: ["Sosmed"], pts: 5, due: "2026-11-10", check: "x 4 feed|x 2 story|o 4 feed lanjutan|o 2 story lanjutan", files: [{ name: "feed-01-04.fig", size: "14 MB", kind: "lainnya", by: "dimas", time: "2026-11-03T10:00" }] },
  { n: 3, title: "Video promo 30 detik Pinarak", col: "progress", st: "produksi", type: "desain", pr: "tinggi", who: "galih", by: "mega", labels: ["Video"], pts: 8, due: "2026-11-12", check: "x Storyboard|x Voice over|o Animasi|o Musik & mixing", files: [{ name: "storyboard-v2.pdf", size: "3,2 MB", kind: "pdf", by: "galih", time: "2026-11-01T13:00" }] },
  { n: 4, title: "Ilustrasi empty state aplikasi Pinarak", col: "todo", st: "brief", type: "desain", pr: "sedang", who: "dimas", by: "laras", labels: ["Ilustrasi"], pts: 3, due: "2026-11-10", req: "r1", desc: "Dari permintaan Laras (Engineering & Produk).\n\n- Daftar tamu kosong\n- Belum ada RSVP\n- Belum ada ucapan\n- Galeri kosong" },
  { n: 5, title: "Penyesuaian logo HRIS untuk ikon aplikasi", col: "review", st: "revisi", type: "desain", pr: "sedang", who: "intan", by: "sari", labels: ["Brand"], pts: 2, cm: [["pakbudi", "Logo versi B lebih jelas di layar kecil, tapi warnanya mohon lebih gelap.", "2026-11-02T09:00"]] },
  { n: 6, title: "Deck presentasi Sprint Review Pinarak", col: "done", st: "disetujui", type: "dokumen", pr: "sedang", who: "dimas", by: "nadia", labels: ["Presentasi"], pts: 2 },
  { n: 7, title: "Copy kampanye “Undangan tanpa ribet”", col: "progress", st: "konsep", type: "task", pr: "sedang", who: "dian", by: "mega", labels: ["Copy"], pts: 2, note: { tone: "working", text: "Dian menulis 3 alternatif headline…" } },
  { n: 8, title: "Mockup aplikasi untuk materi iklan", col: "todo", st: "brief", type: "desain", pr: "rendah", labels: ["Sosmed"], pts: 2, backlog: true },
]);

const konten = build("konten-sosmed", "SOS", [
  { n: 21, title: "Kalender konten November", col: "progress", st: "draf", type: "konten", pr: "tinggi", who: "mega", labels: ["Sosmed"], pts: 3, due: "2026-11-04", check: "x Tema mingguan|x Slot reels|o Pembagian PIC|o Review Bhagas" },
  { n: 22, title: "Carousel “5 tips RSVP biar tamu nggak lupa”", col: "review", st: "review", type: "konten", pr: "sedang", who: "reza", labels: ["Sosmed"], pts: 2, due: "2026-11-05" },
  { n: 23, title: "Reels behind-the-scenes kantor 3D", col: "todo", st: "ide", type: "konten", pr: "sedang", who: "galih", labels: ["Video"], pts: 3 },
  { n: 24, title: "Thread LinkedIn: studi kasus absensi wajah HRIS", col: "done", st: "tayang", type: "konten", pr: "sedang", who: "reza", labels: ["Copy"], pts: 2, due: "2026-11-06", desc: "Tayang Kamis 6 Nov pukul 10.00 di LinkedIn Kuli Digital." },
  { n: 25, title: "Caption 10 postingan peluncuran Pinarak", col: "done", st: "tayang", type: "konten", pr: "sedang", who: "dian", labels: ["Copy"], pts: 2 },
  { n: 26, title: "Riset hashtag & jam posting terbaik", col: "todo", st: "ide", type: "task", pr: "rendah", who: "dian", labels: ["Sosmed"], pts: 1 },
  { n: 19, title: "Video YouTube: tur kantor 3D Kuli Digital", col: "done", st: "tayang", type: "konten", pr: "sedang", who: "galih", by: "mega", labels: ["Video"], pts: 5, created: "2026-10-27T09:00", updated: "2026-11-02T17:00" },
  { n: 27, title: "Reels rutin · Selasa 10 Nov", col: "review", st: "terjadwal", type: "konten", pr: "sedang", who: "galih", by: "kirana", labels: ["Video"], pts: 2, due: "2026-11-10", created: "2026-11-07T08:00", check: "x Naskah & hook (Kirana)|x Rekam / ambil footage|x Edit + subtitle|x Thumbnail & caption|x Ajukan jadwal tayang" },
  { n: 28, title: "Reels rutin · Jumat 13 Nov", col: "progress", st: "draf", type: "konten", pr: "sedang", who: "galih", by: "kirana", labels: ["Video"], pts: 2, due: "2026-11-13", created: "2026-11-10T08:00", check: "x Naskah & hook (Kirana)|o Rekam / ambil footage|o Edit + subtitle|o Thumbnail & caption|o Ajukan jadwal tayang", note: { tone: "working", text: "Kirana menulis 3 opsi hook untuk Reels Jumat" } },
  { n: 29, title: "Video YouTube mingguan · Senin 16 Nov", col: "todo", st: "ide", type: "konten", pr: "sedang", who: "galih", by: "kirana", labels: ["Video"], pts: 5, due: "2026-11-16", created: "2026-11-11T08:00", check: "o Outline & naskah|o Rekam|o Edit|o Thumbnail|o Judul, deskripsi & chapter|o Potong 2 Shorts (Raga)" },
  { n: 30, title: "Thread LinkedIn · Kamis 12 Nov", col: "review", st: "review", type: "konten", pr: "sedang", who: "reza", by: "kirana", labels: ["Copy"], pts: 1, due: "2026-11-12", created: "2026-11-10T08:00", check: "x Draf (Kirana)|o Review Mega|o Posting manual" },
]).map((t) => {
  const c = contentByTicket[t.key];
  return c ? { ...t, content: { format: c.format, posts: c.posts }, scheduleId: c.scheduleId } : t;
});

export const tickets: Ticket[] = [...pinarak, ...ider, ...hris, ...dolan, ...kreatif, ...konten];

export const labelStyle: Record<string, string> = {
  Frontend: "bg-[#EAF1FF] text-[#2563EB]",
  Backend: "bg-[#E9F8EF] text-[#15803D]",
  Dokumen: "bg-[#FFF1E6] text-[#C2410C]",
  Infra: "bg-[#F1F1F4] text-[#4A4D5A]",
  Design: "bg-[#FDECF4] text-[#BE185D]",
  Mobile: "bg-[#E6F6FB] text-[#0369A1]",
  Bug: "bg-danger-soft text-[#C93035]",
  QA: "bg-[#F3EEFF] text-[#6D28D9]",
  Klien: "bg-[#FFF7D6] text-[#A16207]",
  Brand: "bg-[#FDECEA] text-[#C2410C]",
  Sosmed: "bg-[#E0F2FE] text-[#0369A1]",
  Video: "bg-[#EDE9FE] text-[#6D28D9]",
  Ilustrasi: "bg-[#FCE7F3] text-[#BE185D]",
  Presentasi: "bg-[#F1F1F4] text-[#4A4D5A]",
  Copy: "bg-[#ECFDF5] text-[#047857]",
};

export const allLabels = Object.keys(labelStyle);
