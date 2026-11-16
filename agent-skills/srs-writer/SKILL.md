---
name: srs-writer
description: Menyusun Software Requirements Specification (SRS) dari BRD dan brief menjadi kebutuhan fungsional dan non-fungsional yang terlacak, tidak ambigu, dan bisa diuji. Dipakai untuk tiket dokumen SRS, alur sistem, aturan bisnis, validasi data, dan peran akses.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: analisis
  role: specialist
  output-format: document
  related-skills: brd-writer, use-case-flow, klarifikasi-kebutuhan, user-story-writer, doc-review-checklist
---

# SRS Writer

System Analyst yang menerjemahkan kebutuhan bisnis menjadi spesifikasi yang bisa dikerjakan developer dan diuji QA tanpa bertanya ulang.

## Alur kerja

1. **Baca masukan**: BRD (`list_docs` → `get_doc`), tiket, lampiran (`read_file`). Catat semua `BR-xxx`.
2. **Tentukan modul dan aktor**. Satu modul = satu kelompok alur yang berdiri sendiri.
3. **Tulis kebutuhan fungsional** per modul dengan ID `FR-<MOD>-001` dan tautan ke `BR-xxx`. Untuk alur panjang pakai skill `use-case-flow`.
4. **Lengkapi aturan bisnis, validasi data, status dan transisinya, kebutuhan non-fungsional, integrasi, dan model data konseptual.**
5. **Pasang matriks keterlacakan**: setiap `BR` punya minimal satu `FR`, dan setiap `FR` menunjuk ke `BR`. Yang tidak berpasangan masuk pertanyaan terbuka.
6. **Isi dokumen**: `update_doc` bila kerangka sudah ada, kalau tidak `create_doc` kind `SRS`. Struktur ada di `references/srs-template.md`.
7. **Serahkan**: `submit_doc_review` dan `comment_ticket` (ringkasan, jumlah FR, pertanyaan terbuka, saran epic untuk PM).

## Kaidah menulis kebutuhan

- Satu kebutuhan = satu kalimat "Sistem harus …". Tanpa "dan/atau" berantai, tanpa "dll".
- Bisa diuji: ada kondisi, input, hasil yang bisa diperiksa, dan pesan galat bila gagal.
- Angka konkret untuk non-fungsional ("halaman terbuka ≤ 3 detik di 4G pada 95% permintaan"). Belum ada angka → tulis "[Perlu keputusan]" dan masukkan ke pertanyaan terbuka.
- Tulis perilaku, bukan implementasi. Pilihan teknologi dan skema tabel milik arsitek, kecuali klien mewajibkan.
- Istilah satu arti: buat glosarium dan konsisten memakainya.
- Peran dan hak akses ditulis sebagai matriks aktor × tindakan.

## Jangan

- Menambah fitur yang tidak ada di BRD tanpa menandainya sebagai usulan.
- Menyalin BRD apa adanya. SRS lebih rinci dan operasional.
- Menyetujui dokumen atau menaikkan versi.
