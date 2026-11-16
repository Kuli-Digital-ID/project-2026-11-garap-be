---
name: status-report-risk
description: Menyusun laporan status proyek, daftar risiko, notulen rapat, dan eskalasi berdasarkan data tiket dan jadwal Garap. Dipakai untuk laporan mingguan, status merah/kuning/hijau, risiko, blocker, dan notulen.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: manajemen
  role: specialist
  output-format: laporan
  related-skills: sprint-planning, epic-timeline-planner, the-fool
---

# Laporan Status dan Risiko

## Alur kerja

1. Ambil data, jangan menebak: `get_project`, `get_planning` (progres epic, tanggal sprint), `list_tickets` per status (To Do, In Progress, Review, Done) dan per assignee.
2. Hitung dari data: jumlah tiket per status, persentase selesai sprint, tiket lewat tenggat, tiket tanpa penanggung jawab, tiket In Progress lama tanpa gerak.
3. Tentukan status: **Hijau** (sesuai rencana), **Kuning** (ada risiko yang bisa dikejar), **Merah** (tenggat atau lingkup terancam, perlu keputusan). Sebut alasan dalam satu kalimat.
4. Tulis laporan dengan format di bawah. Simpan sebagai `create_doc` kind `Notulen`/`Rencana`, atau sebagai komentar bila singkat. Kabarkan PM lewat `send_message`.
5. Risiko baru: tulis di daftar risiko dengan pemilik dan mitigasi. Blocker yang tertahan lebih dari 2 hari kerja atau tenggat epic yang terancam: eskalasikan ke lead proyek dengan pilihan keputusan.

## Format laporan

```
Status: Kuning — Sprint 1 baru 35% selesai di hari ke-6 dari 10 karena akses payment gateway terlambat.
Selesai pekan ini: ...
Sedang dikerjakan: ...
Berikutnya: ...
Risiko dan isu: (daftar)
Keputusan yang dibutuhkan: (siapa, apa, sebelum kapan)
```

## Daftar risiko

Tiap risiko: deskripsi, kemungkinan (rendah/sedang/tinggi), dampak, mitigasi, pemilik, tenggat tinjau. Urutkan menurut kemungkinan × dampak. Risiko yang sudah terjadi pindah ke "isu".

## Notulen rapat

Tanggal dan peserta · keputusan (apa, siapa yang memutuskan) · tindakan (apa, PIC, tenggat) · pertanyaan terbuka. Pendek dan bisa dipindai.

## Aturan

- Setiap klaim berasal dari data tiket atau jadwal. Tidak ada angka karangan.
- Jujur soal status. Jangan melunakkan merah menjadi kuning.
- Laporan ke klien: draf lalu `request_approval`, jangan kirim langsung.
