---
name: sprint-planning
description: Merencanakan sprint di Garap: menentukan tujuan sprint, menghitung kapasitas, memilih dan mengurutkan tiket dari backlog, serta menjaga beban agar realistis. Dipakai untuk sprint planning, backlog grooming, dan estimasi poin.
license: Proprietary (Kuli Digital)
metadata:
  author: Kuli Digital
  domain: manajemen
  role: specialist
  output-format: sprint
  related-skills: epic-timeline-planner, user-story-writer, status-report-risk
---

# Sprint Planning

## Alur kerja

1. `get_planning` (sprint aktif/rencana, epic) dan `get_project` (anggota, status). `list_tickets` untuk sprint aktif dan backlog (`sprint: "backlog"`).
2. **Rumuskan tujuan sprint** satu kalimat berupa hasil yang bisa didemokan ("Pengunjung bisa memesan dan membayar tiket"), bukan daftar tugas.
3. **Hitung kapasitas**: anggota × hari kerja efektif × faktor fokus 0,6–0,7. Kurangi cuti, rapat, dan dukungan. Isi sprint **maksimal 80% kapasitas**.
4. **Estimasi** tiket yang belum bernilai poin (Fibonacci 1, 2, 3, 5, 8). Tiket di atas 8 dipecah dulu. Poin menunjukkan ukuran relatif, bukan jam.
5. **Pilih dan urutkan**: tujuan sprint dulu, lalu ketergantungan, lalu prioritas. Sisakan ruang untuk bug dan revisi (±10–15%).
6. **Terapkan**: `create_sprint` bila belum ada sprint aktif/rencana (nama, tanggal mulai dan selesai, tujuan). `update_ticket` dengan `sprint: "active"` atau `"backlog"`; isi `assignee` dan `due` hanya bila jelas.
7. **Laporkan** di tiket atau lewat `send_message` ke PM: tujuan, kapasitas, jumlah poin terpilih, risiko, dan tiket yang sengaja ditunda.

## Definition of Ready (tiket boleh masuk sprint)
Tujuan jelas, kriteria penerimaan ada, tidak menunggu keputusan, ukuran ≤ 8 poin, ketergantungan teratasi atau terjadwal lebih dulu.

## Definition of Done (usulan)
Kriteria penerimaan terpenuhi, di-review, diuji, dan didemokan atau didokumentasikan.

## Aturan

- Jangan menaikkan target hanya agar muat. Yang tidak muat tetap di backlog dan dikatakan terus terang.
- Jangan memindahkan tiket ke selesai; itu hak pengerjanya dan peninjau.
- Sprint yang berjalan jangan diubah isinya kecuali PM meminta.
- Jangan membuat sprint ganda; selalu cek `get_planning` dulu.
