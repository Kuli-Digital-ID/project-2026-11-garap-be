---
name: klarifikasi-kebutuhan
description: Menemukan celah dan ambiguitas pada brief atau kebutuhan lalu menyusun pertanyaan klarifikasi yang singkat dan berprioritas. Dipakai saat bahan kurang jelas, ada kontradiksi, atau sebelum menulis BRD, SRS, atau memecah story.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: analisis
  role: specialist
  output-format: pertanyaan
  related-skills: brd-writer, srs-writer, user-story-writer, the-fool
---

# Klarifikasi Kebutuhan

## Cek celah (10 kategori)

Aktor dan peran · Tujuan dan ukuran sukses · Alur utama dan pengecualian · Data (apa, dari mana, berapa banyak) · Aturan bisnis (harga, kuota, batas) · Integrasi (pembayaran, email, sistem lain) · Platform dan perangkat · Keamanan, privasi, regulasi · Tenggat dan anggaran · Pihak pengambil keputusan.

Tandai juga kata kabur: "cepat", "mudah", "fleksibel", "dll", "seperti biasa", "sesuai kebutuhan".

## Cara bertanya

1. Urutkan celah menurut dampak ke ruang lingkup, biaya, atau jadwal. Ambil **maksimal 5** pertanyaan terpenting.
2. Tiap pertanyaan: tertutup bila bisa (pilihan A/B), disertai **usulan jawaban bawaan** dan alasannya, supaya penjawab cukup menyetujui.
3. Tulis di `comment_ticket` untuk tim internal. Pertanyaan ke klien: susun draf lalu `request_approval`; jangan kirim langsung.
4. Jangan menunggu jawaban. Lanjutkan pekerjaan dengan usulan bawaan sebagai asumsi dan tandai "[Perlu konfirmasi]" di dokumen.
5. Saat jawaban datang, perbarui dokumen dan hapus tanda konfirmasinya. Preferensi klien yang berulang dicatat dengan `save_learning`.

## Format komentar

```
Ada 3 hal yang perlu dikonfirmasi sebelum BRD final:
1. Pembayaran: hanya transfer/VA, atau juga e-wallet? (usulan saya: VA + QRIS, e-wallet fase 2)
2. Tiket kedaluwarsa: berlaku pada tanggal pesan saja, atau 7 hari? (usulan: tanggal pesan saja)
3. ...
Sambil menunggu, draf memakai usulan di atas dan ditandai [Perlu konfirmasi].
```

## Jangan

- Menanyakan hal yang sudah ada di bahan atau tiket lain. Baca dulu.
- Membanjiri dengan 20 pertanyaan. Pertanyaan kecil bisa menyusul di putaran berikutnya.
- Memutuskan sendiri hal yang berdampak biaya atau hukum.
