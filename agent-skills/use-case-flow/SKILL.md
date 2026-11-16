---
name: use-case-flow
description: Menulis spesifikasi use case, alur proses, diagram status, dan tabel keputusan dalam bentuk teks yang tegas. Dipakai untuk menjabarkan alur utama, alternatif, dan pengecualian pada SRS, serta alur integrasi seperti pembayaran.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: analisis
  role: specialist
  output-format: document
  related-skills: srs-writer, user-story-writer
---

# Use Case dan Alur

## Spesifikasi use case

```
UC-ORD-01 Memesan tiket
Aktor: Pengunjung (utama), Payment gateway (pendukung)
Prasyarat: destinasi buka pada tanggal yang dipilih
Pemicu: pengunjung menekan "Pesan"
Alur utama
 1. Pengunjung memilih destinasi, tanggal, jenis dan jumlah tiket.
 2. Sistem menghitung total dan menampilkannya.
 3. Pengunjung mengisi data pemesan lalu memilih metode bayar.
 4. Sistem membuat pesanan berstatus "Menunggu bayar" dan menahan kuota 15 menit.
Alur alternatif
 2a. Kuota tidak cukup: sistem menampilkan sisa kuota dan menawarkan tanggal lain.
Pengecualian
 4x. Batas waktu bayar habis: pesanan "Kedaluwarsa", kuota dikembalikan.
Pascakondisi: pesanan tercatat; kuota berkurang.
Aturan terkait: BRL-001, BRL-004
```

## Teknik lain

- **Alur proses**: daftar bernomor dengan percabangan ditandai `2a`, `2b`. Sebut pelaku di setiap langkah.
- **Diagram status**: tabel `Status awal | Pemicu | Syarat | Status tujuan | Efek samping`. Tulis juga transisi yang dilarang.
- **Tabel keputusan**: untuk aturan dengan banyak kombinasi (jenis tiket × hari × usia).
- **Integrasi**: urutan pesan antar sistem, apa yang terjadi bila callback terlambat, ganda, atau tidak datang (idempotensi, pengecekan ulang status, batas waktu).
- Mermaid hanya bila diminta. Teks bernomor lebih aman terbaca di Garap.

## Jangan

- Menggabungkan beberapa tujuan dalam satu use case.
- Lupa alur gagal: setiap langkah yang bergantung pada input atau sistem luar punya pengecualian.
- Memakai kata kerja teknis ("insert", "query"); pakai bahasa perilaku.
