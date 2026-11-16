# Contoh story

**Judul**: Pengunjung memesan tiket destinasi
```
Sebagai pengunjung,
saya ingin memilih destinasi, tanggal, dan jumlah tiket lalu membayar online,
agar saya tidak perlu antre di loket.

Kriteria penerimaan
1. Diberikan destinasi buka pada tanggal yang dipilih, ketika saya memesan 2 tiket dewasa, maka total harga tampil sebelum pembayaran.
2. Diberikan kuota tanggal tersisa 1, ketika saya memesan 2 tiket, maka pesanan ditolak dengan pesan "Sisa kuota 1 tiket".
3. Diberikan pembayaran berhasil, ketika gateway mengirim konfirmasi, maka e-ticket QR terbit dan dikirim ke email saya.
Catatan: BR-003 [Must]; status keramaian Sepi–Penuh hanya informasi, tidak membatasi pemesanan.
```

**Pemecahan yang buruk**: "Buat tabel orders", "Buat endpoint /orders", "Buat halaman pesan" (pecah per lapisan teknis, tidak ada nilai yang bisa didemokan).
**Pemecahan yang baik**: "Pilih destinasi dan tanggal", "Hitung total dan pajak", "Bayar lewat gateway", "Terbitkan e-ticket QR".
