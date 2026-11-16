# Template SRS

## 1. Pendahuluan
Tujuan dokumen, pembaca, cakupan, referensi (BRD, versi), glosarium.

## 2. Gambaran sistem
Konteks singkat: sistem apa, untuk siapa, berinteraksi dengan sistem lain apa. Batas sistem (di dalam / di luar).

## 3. Aktor dan hak akses
Daftar aktor. Matriks "aktor × tindakan" dengan ya/tidak, misalnya Pengunjung, Karyawan, Admin.

## 4. Kebutuhan fungsional
Per modul. Format tiap kebutuhan:
```
FR-ORD-003 (BR-003, Must)
Sistem harus menolak pesanan bila sisa kuota tanggal tersebut lebih kecil dari jumlah tiket yang dipesan.
Input: destinasi, tanggal, jumlah tiket. Hasil: pesanan ditolak, pesan "Sisa kuota {n} tiket".
Validasi: jumlah 1–10, tanggal tidak lampau.
```

## 5. Aturan bisnis
`BRL-001 ...` daftar aturan (harga, pajak, kuota, kedaluwarsa, pembatalan). Tabel keputusan bila kombinasinya banyak.

## 6. Status dan transisi
Per entitas yang berstatus (pesanan, tiket, pembayaran): daftar status, transisi yang diizinkan, pemicu, dan siapa yang boleh.

## 7. Kebutuhan non-fungsional
Kinerja, ketersediaan, keamanan (autentikasi, otorisasi, data pribadi), audit log, pencadangan, kompatibilitas perangkat, aksesibilitas. Setiap butir dengan angka atau "[Perlu keputusan]".

## 8. Integrasi dan antarmuka eksternal
Sistem lain (payment gateway, email, peta): apa yang dipertukarkan, kapan, perilaku bila gagal, idempotensi/pengulangan.

## 9. Model data konseptual
Entitas, atribut utama, relasi, dan data yang bersifat pribadi. Bukan skema tabel final.

## 10. Asumsi, batasan, dan pertanyaan terbuka

## 11. Matriks keterlacakan
`BR-001 → FR-ORD-001, FR-ORD-002`. Tandai BR tanpa FR dan FR tanpa BR.
