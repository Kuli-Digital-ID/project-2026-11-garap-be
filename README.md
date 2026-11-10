<div align="center">
  <h1>Garap — Backend</h1>
  <p>API manajemen proyek untuk tim manusia & agent AI Kuli Digital (NestJS 11 · Prisma 7 · PostgreSQL).</p>
</div>

---

## Menjalankan di lokal

Database memakai Postgres yang sudah ada (container `postgis-kuli`, port 5432, user `docker`), database `garap_db`.

```bash
cp .env.example .env          # lalu isi DATABASE_URL & JWT_SECRET
npm install
npx prisma migrate dev        # buat/terapkan tabel
npm run prisma:seed           # isi data demo (sama dengan demo FE)
npm run start:dev             # http://localhost:4000
```

- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/v1/health
- FE Garap berjalan di http://localhost:3000 (`CORS_ORIGIN` & `FRONTEND_URL`).

`npm run prisma:seed` **mengosongkan semua tabel** lalu mengisi ulang data demo.

## Login

Garap aplikasi internal: tidak ada pendaftaran mandiri. Owner/Admin mendaftarkan akun (`POST /api/v1/members`)
dengan email kantor; orang tersebut lalu masuk lewat SSO Keycloak dengan email yang sama.

| Alur | Endpoint |
| --- | --- |
| Mulai login (FE mengarahkan tombol "Masuk dengan SSO" ke sini) | `GET /api/v1/auth/sso/login?redirect=/proyek` |
| Callback Keycloak (daftarkan sebagai *Valid Redirect URI*) | `GET /api/v1/auth/sso/callback` |
| Akun yang sedang masuk | `GET /api/v1/auth/me` |
| Keluar (FE lalu membuka `logoutUrl`) | `POST /api/v1/auth/logout` |
| Metode login yang aktif | `GET /api/v1/auth/config` |

Gagal login → FE diarahkan ke `/masuk?error=tidak-terdaftar | nonaktif | sso-gagal | sso-belum-diatur`.

Client Keycloak: *confidential*, Standard flow (Authorization Code + PKCE S256), scope `openid email profile`,
Valid post logout redirect URI `http://localhost:3000/masuk`.

Selama Keycloak belum siap, set `AUTH_PASSWORD_LOGIN=true` dan login dengan `POST /api/v1/auth/login`
(email anggota dari seed, password `password123`). **Matikan di produksi.**

## Hak akses

Posisi: **Owner** (semua izin), **Admin**, **Anggota**, **Tamu** (hanya proyek tempat ia diundang), **Agent**.
Izin bawaan ada di `src/common/constants/permissions.constant.ts` dan bisa diubah lewat `PUT /api/v1/positions/:id/permissions`.

## Modul API

| Modul | Isi |
| --- | --- |
| `members`, `agents`, `divisions`, `positions` | Akun, agent AI (pilih penyedia + model), divisi, izin |
| `ai-providers` | API key Anthropic, Gemini, Grok, OpenAI, OpenRouter, atau server sendiri (Ollama/vLLM). Key diuji ke penyedia lalu disimpan terenkripsi AES-256-GCM (`AI_KEY_SECRET`); FE hanya menerima 4 karakter terakhir |
| `projects` | Proyek dari template (software/kanban/kreatif/konten), anggota, alur kerja + WIP, sprint (selesaikan + carry-over), epic |
| `tickets` | Papan & backlog, geser kartu (`/move`), bulk, komentar (@mention), checklist, relasi, lampiran, pemantau, sub-tugas |
| `requests` | Permintaan lintas divisi: kirim → tinjau → terima (jadi tiket) / tolak; tiket selesai → permintaan selesai |
| `docs` | BRD, SRS, arsitektur, notulen; Draf → Direview → Disetujui |
| `content`, `social` | Kalender konten, konten rutin (tiket dibuat otomatis H-n), publikasi per akun (draf → persetujuan → terjadwal → tayang), agent menulis caption/naskah dengan model AI-nya, statistik & laporan performa, akun YouTube/Instagram/Facebook/TikTok/LinkedIn/X (OAuth atau manual) |
| `approvals`, `runs` | Persetujuan tindakan agent, riwayat run agent |
| `notifications`, `audit` | Notifikasi per akun, log audit |

Respons memakai bentuk yang sama dengan tipe FE (`src/lib/types.ts`): id anggota = `username`, proyek = `slug`, tiket = `key`.

## Konten & media sosial

Pekerja latar (`CONTENT_RUNNER=true`, tiap menit) membuat tiket dari konten rutin, menayangkan postingan terjadwal yang sudah disetujui,
dan memperbarui statistik tiap 6 jam. Akun **manual** tidak diposting otomatis: penanggung jawab diingatkan pada jam tayang lalu menempel link postingan.

Untuk posting otomatis, buat aplikasi developer di tiap platform lalu isi client id/secret di `.env`
(callback: `{API_PUBLIC_URL}/api/v1/social/oauth/callback/{platform}`), kemudian buka `GET /api/v1/social/connect/{platform}?projects=konten-sosmed` dari browser.
Catatan platform: unggahan YouTube lewat API berstatus private sampai aplikasi lolos audit Google; TikTok hanya `SELF_ONLY` sampai lolos audit;
Instagram butuh akun Business/Creator yang terhubung ke Halaman Facebook; LinkedIn & X saat ini hanya postingan teks.
Media diambil dari lampiran tiket yang punya URL publik.

## Struktur

```
prisma/
  schema.prisma
  migrations/
  seeder/            # index.ts + steps/*, data demo disalin dari FE (seeder/demo)
src/
  common/            # guard, decorator, serializers (DB → JSON FE), konstanta
  config/
  modules/
    auth/ activity/ organization/ projects/ tickets/ requests/ docs/ health/
```
