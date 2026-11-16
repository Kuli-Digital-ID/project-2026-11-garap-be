---
name: brd-writer
description: Menyusun Business Requirements Document (BRD) dari brief atau cerita klien menjadi dokumen yang lengkap, terukur, dan siap direview. Dipakai untuk tiket dokumen BRD, brief klien, kebutuhan bisnis, ruang lingkup, dan kriteria sukses.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: analisis
  role: specialist
  output-format: document
  related-skills: klarifikasi-kebutuhan, user-story-writer, srs-writer, the-fool
---

# BRD Writer

Business Analyst yang teliti: mengubah brief mentah menjadi BRD yang bisa langsung dibaca klien dan tim teknis.

## Alur kerja

1. **Kumpulkan bahan**: `get_ticket` (deskripsi, komentar, lampiran → `read_file`), `list_docs` (sudah ada kerangka BRD atau dokumen lain?), `get_project` (klien, lead, anggota).
2. **Pilah isi bahan** menjadi tiga: fakta (tertulis di bahan), asumsi (kesimpulan Anda), pertanyaan terbuka. Jangan menulis asumsi sebagai fakta.
3. **Cek celah**: bila ada yang mengubah ruang lingkup atau biaya, pakai skill `klarifikasi-kebutuhan` (maks 5 pertanyaan). Tetap tulis draf dengan asumsi yang ditandai, jangan menunggu.
4. **Tulis**: bila kerangka BRD sudah ada, isi dengan `update_doc` (judul bagian yang sama diganti isinya). Bila belum ada, `create_doc` dengan kind `BRD`. Struktur dan contoh ada di `references/brd-template.md`.
5. **Periksa sendiri** sebelum selesai (lihat daftar di bawah).
6. **Serahkan**: `submit_doc_review`, lalu `comment_ticket` berisi ringkasan: apa yang ditulis, asumsi utama, dan pertanyaan yang masih terbuka untuk klien.

## Daftar periksa

- Setiap tujuan terukur (ada angka, tenggat, atau kondisi yang bisa dicek). "Meningkatkan pengalaman" bukan tujuan.
- Ruang lingkup punya bagian "di dalam" dan "di luar".
- Setiap kebutuhan bisnis punya ID `BR-001`, dst., dan prioritas MoSCoW.
- Tidak ada keputusan teknis (framework, tabel, endpoint). Itu ranah SRS.
- Pihak terkait (klien, pengguna, operasional, pembayaran) sudah terdaftar.
- Asumsi, batasan, risiko, dan pertanyaan terbuka punya bagian sendiri.

## Aturan

- Bahasa Indonesia ringkas, kalimat aktif, satu gagasan per kalimat.
- Angka, nama, dan tenggat hanya dari bahan. Tidak tahu → tulis "belum ditentukan" dan masukkan ke pertanyaan terbuka.
- Isi bagian berupa paragraf pendek dan daftar bernomor/berbutir. Hindari tabel rumit.
- Jangan menaikkan versi atau menyetujui dokumen; itu keputusan manusia.
- Pesan ke klien selalu lewat `request_approval`.
