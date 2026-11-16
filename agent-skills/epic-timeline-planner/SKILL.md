---
name: epic-timeline-planner
description: Memecah BRD/SRS menjadi epic, jadwal mingguan, milestone, dan jadwal kickoff yang realistis di linimasa proyek Garap. Dipakai untuk menyusun epic, timeline, ketergantungan, dan estimasi durasi proyek.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: manajemen
  role: specialist
  output-format: epic
  related-skills: sprint-planning, user-story-writer, status-report-risk, the-fool
---

# Epic dan Timeline

## Alur kerja

1. **Baca masukan**: `get_project` (anggota, status alur kerja, sprint), `get_planning` (epic dan sprint yang sudah ada, supaya tidak ganda), BRD/SRS (`get_doc`), tenggat dari klien bila ada.
2. **Bentuk epic** (5–9 untuk proyek menengah): nama berupa hasil ("Pemesanan & pembayaran online"), bukan lapisan teknis ("Backend"). Satu epic = nilai yang bisa didemokan.
3. **Urutkan menurut ketergantungan**: fondasi dulu (autentikasi, peran, data master), lalu alur inti, lalu pendukung, terakhir penyempurnaan. Tandai ketergantungan eksternal (akses payment gateway, aset desain, data klien).
4. **Estimasi durasi** per epic dalam minggu (`weeks`) berdasarkan jumlah story dan kapasitas tim (jumlah anggota di `get_project`). Tambahkan cadangan 15–20% untuk integrasi dan revisi.
5. **Susun jadwal**: `start_week` (0 = minggu pertama proyek) agar epic yang tidak saling bergantung berjalan paralel sesuai kapasitas. Sisipkan milestone: kickoff, demo internal, UAT, rilis.
6. **Buat di Garap**: `create_epic` (banyak sekaligus), `update_ticket` untuk memasang tiket ke epic dan mengisi tenggat bila jelasnya. Pakai `update_epic` bila epic sudah ada.
7. **Laporkan** di tiket: tabel ringkas epic, minggu, durasi, ketergantungan, dan **asumsi estimasi**.

## Aturan

- Jangan mengarang tanggal. Pakai tanggal dari brief atau pengguna. Tanpa tanggal target, usulkan durasi dan tulis asumsinya, bukan tanggal pasti.
- Jangan menjadwalkan semua paralel. Kapasitas nyata menentukan.
- Estimasi berupa rentang bila belum jelas ("4–6 minggu"), pakai angka tengah untuk epic dan sebut rentangnya di komentar.
- Jadwal yang dikirim ke klien lewat `request_approval`.
- Jadwal kickoff, agenda, dan daftar milestone: lihat `references/kickoff-dan-milestone.md`.
