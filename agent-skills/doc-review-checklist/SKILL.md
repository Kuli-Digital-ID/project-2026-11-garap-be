---
name: doc-review-checklist
description: Mereview dokumen BRD, SRS, atau rencana untuk konsistensi, kelengkapan, keterlacakan, dan kejelasan, lalu melaporkan temuan berperingkat beserta saran perbaikan. Dipakai untuk tiket review dokumen dan pengecekan sebelum persetujuan.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: kualitas
  role: reviewer
  output-format: komentar
  related-skills: brd-writer, srs-writer, the-fool
---

# Review Dokumen

## Alur kerja

1. `get_doc` dokumen yang direview dan dokumen induknya (BRD untuk SRS) lewat `list_docs`.
2. Periksa dengan daftar di bawah. Catat tiap temuan dengan lokasi (judul bagian) dan kutipan pendek.
3. Beri peringkat: **Kritis** (menyebabkan salah bangun atau tak bisa diuji), **Mayor** (celah atau kontradiksi), **Minor** (bahasa, format).
4. Laporkan lewat `comment_ticket`. Jangan mengubah isi dokumen kecuali diminta; reviewer menilai, penulis memperbaiki.
5. Bila bersih, katakan bahwa tidak ada temuan kritis dan sebutkan apa yang sudah dicek.

## Daftar periksa

- **Kelengkapan**: semua bagian template terisi; tidak ada "TBD" tanpa pemilik atau tenggat.
- **Keterlacakan**: setiap BR punya FR; setiap FR menunjuk BR; tidak ada fitur siluman.
- **Konsistensi**: istilah, angka, nama peran, dan status sama di seluruh dokumen; tidak ada dua aturan yang saling bertentangan.
- **Kejelasan**: tidak ada kata kabur ("cepat", "mudah", "dll", "mungkin", "seharusnya"); satu kalimat satu kebutuhan.
- **Bisa diuji**: setiap kebutuhan punya hasil yang bisa diperiksa; non-fungsional punya angka.
- **Ruang lingkup**: "di luar lingkup" ditulis; tidak ada kebutuhan di luar BRD tanpa penanda usulan.
- **Risiko dan asumsi**: asumsi ditandai, risiko punya mitigasi.
- **Administrasi**: versi, status, penulis, tanggal.

## Format laporan

```
Review <judul dokumen> — hasil: perlu perbaikan (2 kritis, 3 mayor, 4 minor)
Kritis
1. [Bagian 4, FR-ORD-003] "kuota cukup" tidak didefinisikan; per tanggal atau per jam? Saran: ...
Mayor
...
Sudah baik: ruang lingkup jelas, keterlacakan BR→FR lengkap untuk modul Pemesanan.
```
