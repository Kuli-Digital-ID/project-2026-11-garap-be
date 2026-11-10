import type { Doc } from "../types";

export const docs: Doc[] = [
  {
    id: "pnr-brd", project: "pinarak", title: "BRD Pinarak v2 — Paket & monetisasi", kind: "BRD", authorId: "raka", reviewerId: "fajar", status: "Direview", version: "2.0-draf", updated: "2026-11-01T08:50", pages: 14,
    sections: [
      { heading: "1. Latar belakang", body: "Pasar undangan digital di Indonesia tumbuh seiring kebiasaan berbagi lewat WhatsApp. Survei kami terhadap 40 calon pengantin menunjukkan 85% sudah pernah menerima undangan digital, tetapi hanya 30% yang puas dengan RSVP-nya: data tamu tercecer di chat dan sulit direkap." },
      { heading: "2. Tujuan", body: "• Pengguna membuat undangan siap kirim dalam < 15 menit.\n• RSVP terekap otomatis dan bisa diekspor ke vendor katering.\n• 8% pengguna gratis beralih ke paket berbayar dalam 60 hari." },
      { heading: "3. Paket", body: "Basic (gratis): 1 template, 100 tamu, watermark Pinarak.\nPremium (Rp 149.000): semua template, 500 tamu, musik latar, tanpa watermark.\nEksklusif (Rp 349.000): 2.000 tamu, domain sendiri, amplop digital, prioritas dukungan.\n\n⚠ Menunggu keputusan Bhagas: amplop digital masuk Premium atau add-on; batas tamu Premium 500 atau 1.000." },
      { heading: "4. Kebutuhan fungsional", body: "4.1 Editor berbasis blok dengan simpan otomatis.\n4.2 RSVP dengan status Hadir / Tidak hadir / Ragu dan jumlah orang.\n4.3 Buku tamu & ucapan dengan moderasi.\n4.4 Pembayaran paket via iPaymu (VA, QRIS, e-wallet)." },
      { heading: "5. Asumsi & risiko", body: "Asumsi: biaya transaksi iPaymu 0,7–2%; rata-rata tamu 350 orang.\nRisiko: lonjakan RSVP di jam yang sama setelah undangan disebar (mitigasi: antrean & uji beban PNR-160)." },
    ],
  },
  {
    id: "pnr-srs", project: "pinarak", title: "SRS Pinarak v1 — Modul undangan & RSVP", kind: "SRS", authorId: "sinta", reviewerId: "fajar", status: "Direview", version: "1.0", updated: "2026-10-31T16:30", pages: 22,
    sections: [
      { heading: "1. Ruang lingkup", body: "Dokumen ini menjabarkan perilaku sistem untuk pembuatan undangan, pengelolaan tamu, RSVP, dan ucapan. Pembayaran dibahas di SRS terpisah." },
      { heading: "2. Aktor", body: "Pemilik undangan, Tamu (tanpa akun), Admin Pinarak." },
      { heading: "3. Alur RSVP", body: "1) Tamu membuka tautan unik /r/{token}.\n2) Sistem menampilkan nama tamu dan acara.\n3) Tamu memilih status dan jumlah orang (maks. sesuai undangan).\n4) Sistem menyimpan dan mengirim notifikasi ke pemilik (diringkas per jam)." },
      { heading: "4. Aturan validasi", body: "• Nomor HP disimpan dalam format E.164.\n• Jumlah orang 1–10.\n• Token RSVP berlaku sampai H+1 acara." },
    ],
  },
  {
    id: "pnr-arch", project: "pinarak", title: "Arsitektur & ERD Pinarak", kind: "Arsitektur", authorId: "bima", reviewerId: "andi", status: "Disetujui", version: "4.0", updated: "2026-10-31T17:05", pages: 9,
    sections: [
      { heading: "Ringkasan", body: "Next.js (FE) di Cloudflare Pages, NestJS (BE) di Fly.io, PostgreSQL di Neon, antrean BullMQ di Upstash Redis. Subdomain undangan dilayani Cloudflare Worker." },
      { heading: "Entitas utama", body: "users, invitations, invitation_blocks, guests, guest_groups (baru di v4), rsvps, wishes, payments, payment_events." },
      { heading: "Keputusan", body: "• Primary key UUID v7.\n• Webhook idempoten dengan reference_id unik.\n• Media disimpan di R2, maksimal 20 MB per undangan Basic." },
    ],
  },
  {
    id: "pnr-sprint4", project: "pinarak", title: "Rencana Sprint 4", kind: "Rencana", authorId: "nadia", status: "Direview", version: "1.0", updated: "2026-11-01T07:30", pages: 4,
    sections: [
      { heading: "Tujuan sprint", body: "Pengguna bisa membuat undangan dari template, mengisi RSVP, dan membayar paket Premium." },
      { heading: "Kapasitas", body: "Manusia: 6 orang × 6 jam fokus × 9 hari kerja. Agent: 7 agent, dibatasi kuota Rp 180rb untuk sprint ini. Total estimasi 58 poin; direncanakan 52 poin." },
      { heading: "Risiko", body: "1. BRD v2 belum final → SRS RSVP tertunda (PNR-149).\n2. Sandbox iPaymu kadang lambat (PNR-152)." },
      { heading: "Jadwal", body: "Daily 09.30 · Review & demo Jumat 7 Nov 14.00 · Retro Jumat 7 Nov 15.30." },
    ],
  },
  {
    id: "pnr-api", project: "pinarak", title: "Panduan API Pinarak", kind: "Panduan", authorId: "tari", status: "Draf", version: "0.3", updated: "2026-10-30T15:00", pages: 6,
    sections: [
      { heading: "Autentikasi", body: "Semua permintaan memakai header Authorization: Bearer <token>. Token berlaku 15 menit, perbarui lewat /auth/refresh." },
      { heading: "Contoh: membuat undangan", body: "POST /invitations\n{ \"title\": \"Ayu & Dimas\", \"templateId\": \"tmpl_jawa_01\", \"date\": \"2027-02-14\" }" },
    ],
  },
  {
    id: "pnr-notulen", project: "pinarak", title: "Notulen rapat arsitektur 22 Okt", kind: "Notulen", authorId: "nadia", status: "Disetujui", version: "1.0", updated: "2026-10-22T16:00", pages: 2,
    sections: [
      { heading: "Peserta", body: "Bhagas, Andi, Rizky, Bima (agent), Nadia (agent, notulis)." },
      { heading: "Keputusan", body: "1. UUID v7 untuk semua PK baru.\n2. Antrean BullMQ untuk email & notifikasi.\n3. Subdomain via Worker, bukan wildcard DNS ke server." },
      { heading: "Tindak lanjut", body: "Bima memperbarui ERD (selesai 31 Okt). Rizky menyiapkan Worker (PNR-147)." },
    ],
  },
  {
    id: "idr-brd", project: "ider", title: "BRD Ider — Sales lapangan", kind: "BRD", authorId: "raka", reviewerId: "fajar", status: "Disetujui", version: "1.2", updated: "2026-10-12T10:00", pages: 12,
    sections: [
      { heading: "Masalah", body: "Sales CV Sumber Makmur mencatat order di kertas; rekap baru masuk 2–3 hari kemudian dan sering salah harga." },
      { heading: "Solusi", body: "Aplikasi Android yang bekerja tanpa sinyal: check-in toko, order, foto display, lalu sinkron otomatis." },
    ],
  },
  {
    id: "idr-sync", project: "ider", title: "Strategi sinkronisasi offline", kind: "Arsitektur", authorId: "bima", reviewerId: "rizky", status: "Direview", version: "0.9", updated: "2026-10-31T13:20", pages: 5,
    sections: [
      { heading: "Pendekatan", body: "Outbox pattern di SQLite. Setiap order punya client_id (UUID v7). Server menolak duplikat dan mengembalikan status stok terbaru." },
      { heading: "Konflik stok", body: "Jika stok tidak cukup saat sinkron, order masuk status ‘Perlu konfirmasi’ dan supervisor menerima notifikasi." },
    ],
  },
  {
    id: "hrs-brd", project: "hris", title: "BRD HRIS PT Sinar Abadi", kind: "BRD", authorId: "raka", reviewerId: "fajar", status: "Disetujui", version: "1.4", updated: "2026-10-29T10:10", pages: 18,
    sections: [
      { heading: "Ruang lingkup", body: "Absensi wajah & lokasi untuk 640 karyawan di 12 cabang, cuti & lembur, penggajian dengan BPJS dan PPh 21." },
      { heading: "3.4 Persetujuan cuti", body: "Staf: atasan langsung → HRD. Manajer ke atas: langsung HRD (revisi 29 Okt sesuai arahan Pak Budi)." },
    ],
  },
  {
    id: "hrs-payroll", project: "hris", title: "BRD Modul penggajian", kind: "BRD", authorId: "raka", status: "Draf", version: "0.4", updated: "2026-11-01T09:30", pages: 7,
    sections: [
      { heading: "Komponen gaji", body: "Gaji pokok, tunjangan tetap & tidak tetap, lembur, potongan BPJS Kesehatan & Ketenagakerjaan, PPh 21 metode TER." },
      { heading: "Pertanyaan terbuka", body: "Apakah THR dihitung proporsional untuk karyawan < 12 bulan? (menunggu Pak Budi)" },
    ],
  },
  {
    id: "dln-brd", project: "dolan", title: "BRD Dolan — Marketplace tiket wisata", kind: "BRD", authorId: "raka", reviewerId: "fajar", status: "Direview", version: "1.0", updated: "2026-10-31T11:00", pages: 11,
    sections: [
      { heading: "Visi", body: "Satu tempat memesan tiket destinasi dan paket tur lokal Yogyakarta, dengan e-tiket QR yang dipindai di loket." },
      { heading: "Pengguna", body: "Wisatawan domestik, pengelola destinasi (mitra), admin Dolan." },
    ],
  },
];
