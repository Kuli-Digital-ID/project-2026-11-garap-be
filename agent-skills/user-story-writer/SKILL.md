---
name: user-story-writer
description: Menulis user story beserta kriteria penerimaan (Given/When/Then) dan memecahnya menjadi tiket yang siap dikerjakan. Dipakai untuk memecah BRD, SRS, atau brief menjadi story, menentukan prioritas MoSCoW, dan mengelompokkan ke epic.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: analisis
  role: specialist
  output-format: tiket
  related-skills: brd-writer, srs-writer, epic-timeline-planner, sprint-planning
---

# User Story Writer

## Alur kerja

1. Baca sumbernya (BRD/SRS lewat `get_doc`, lampiran lewat `read_file`) dan `get_planning` (epic yang sudah ada). Jangan membuat epic atau story kembar: `list_tickets` dulu.
2. Kelompokkan kebutuhan per aktor dan per alur (satu alur utama = satu epic atau beberapa story).
3. Tulis story dengan format di bawah. Beri prioritas MoSCoW dan tautan ke ID kebutuhan (`BR-xxx` / `FR-xxx`).
4. Buat tiket: `create_ticket` type `story`, judul ≤ 80 karakter, deskripsi berisi story + kriteria penerimaan, `epic` bila sudah ada. Panggil beberapa `create_ticket` sekaligus dalam satu giliran.
5. Story yang belum siap (ada pertanyaan terbuka) tetap dibuat tetapi `sprint: "backlog"` dan pertanyaannya ditulis di deskripsi.
6. Tutup dengan `comment_ticket`: jumlah story, epic yang terbentuk, dan yang masih menunggu keputusan.

## Format

```
Sebagai <peran/aktor>,
saya ingin <tujuan yang bisa dilakukan>,
agar <manfaat bisnis>.

Kriteria penerimaan
1. Diberikan <kondisi awal>, ketika <aksi>, maka <hasil yang bisa diperiksa>.
2. ...
Catatan: <aturan bisnis, pengecualian, tautan BR/FR>
```

## Uji INVEST

Independen, Negotiable, bernilai (Valuable), bisa Diestimasi, Kecil (selesai dalam satu sprint), bisa diuji (Testable). Story yang gagal salah satunya: pecah atau perjelas.

## Cara memecah story besar

- Per langkah alur (pesan → bayar → terima tiket), bukan per lapisan teknis (UI, API, DB).
- Per aturan bisnis atau varian data (alur normal dulu, pengecualian menyusul).
- Per peran pengguna.
- Pisahkan "bisa dipakai" dari "disempurnakan" (validasi lanjutan, filter, ekspor).

## Aturan

- Kriteria penerimaan minimal 2 (satu alur normal, satu kondisi gagal) dan bisa diuji tanpa tafsir.
- Jangan menulis solusi teknis di story. Yang teknis masuk subtask atau SRS.
- Jangan mengarang aktor atau aturan yang tidak ada di bahan; tulis sebagai pertanyaan.
- Contoh ada di `references/contoh-story.md`.
