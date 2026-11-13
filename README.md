<div align="center">
  <h1>Garap — Backend</h1>
  <p>API manajemen proyek untuk tim manusia & agent AI Kuli Digital (NestJS 11 · Prisma 7 · PostgreSQL).</p>
</div>

---

## Menjalankan di lokal

Database memakai Postgres yang sudah ada (container `postgis-kuli`, port 5432, user `docker`), database `garap_db`.

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

Isi `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, dan `AI_KEY_SECRET` di `.env` sebelum menjalankan migrasi.

- API: http://localhost:4000 · Swagger: http://localhost:4000/api/docs · Health: http://localhost:4000/api/v1/health
- `npm run prisma:seed` **mengosongkan semua tabel** lalu hanya menyisakan posisi + izin, workspace, dan satu akun Owner
  (`bhagaskuro`, email `bhagaskuro@gmail.com`). Tanpa `OWNER_PASSWORD`, password acak dicetak sekali dan wajib diganti saat masuk pertama.
  Ganti isi akun lewat `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_USERNAME`, `OWNER_PASSWORD`. Di produksi wajib `SEED_CONFIRM=yes`.
- `npm run prisma:seed:demo` mengosongkan semua tabel lalu mengisi data demo (sama dengan demo FE).
  Semua akun manusia di data demo memakai password `password123` (ubah lewat `SEED_DEV_PASSWORD`).
- Untuk database sungguhan (tanpa data demo) pakai `prisma:init`: membuat posisi, izin, dan akun Owner pertama tanpa menghapus apa pun.

```bash
OWNER_EMAIL=nama@kantor.id OWNER_NAME="Nama Lengkap" OWNER_PASSWORD='rahasia123' npm run prisma:init
```

## Login & hak akses (RBAC)

Garap aplikasi internal: tidak ada pendaftaran mandiri. Owner/Admin mendaftarkan akun, lalu orang tersebut masuk dengan email + password.

| Alur | Endpoint |
| --- | --- |
| Masuk | `POST /api/v1/auth/login` `{ email, password }` → cookie `Authentication` + `{ id, name, email, access, mustChangePassword }` |
| Akun yang sedang masuk + izinnya | `GET /api/v1/auth/me` |
| Ganti password sendiri | `POST /api/v1/auth/change-password` `{ currentPassword, newPassword }` |
| Keluar | `POST /api/v1/auth/logout` |
| Daftarkan akun (Owner/Admin) | `POST /api/v1/members` — tanpa `password` → respons memuat `temporaryPassword` (tampil sekali) |
| Reset password anggota (Owner/Admin) | `POST /api/v1/members/:username/reset-password` |

- **Password sementara** (akun baru / hasil reset) wajib diganti: `user.mustChangePassword = true`, dan semua endpoint selain
  `auth/me`, `auth/change-password`, `auth/logout` menjawab `403` dengan `errors.code = "PASSWORD_CHANGE_REQUIRED"`.
- **Salah password 5 kali** → akun terkunci 15 menit (`429`, `errors.code = "ACCOUNT_LOCKED"`). Reset oleh Owner/Admin membuka kunci.
- **Ganti/reset password, nonaktifkan, atau hapus akun** langsung mengakhiri semua sesi lama akun itu.
- Aturan password: minimal 8 karakter, memuat huruf dan angka.

Posisi: **Owner** (semua izin), **Admin**, **Anggota**, **Tamu** (hanya proyek tempat ia diundang), **Agent** (tidak login lewat halaman masuk).
Izin bawaan ada di `src/common/constants/permissions.constant.ts` dan bisa diubah lewat `PUT /api/v1/positions/:id/permissions`.
Peran dan izin dibaca ulang dari database di setiap request, jadi perubahan hak akses langsung berlaku tanpa login ulang.

## Integrasi dengan FE

**Sesi** disimpan di cookie httpOnly `Authentication` yang dipasang oleh `POST /auth/login`; token tidak dikirim di body.
Panggil API dengan `fetch(url, { credentials: 'include' })`, lalu ambil peran & izin dari `GET /auth/me`.
Alamat FE harus terdaftar di `CORS_ORIGIN`. Bila FE dan API beda situs (mis. `*.workers.dev` + domain lain), set `COOKIE_SAMESITE=none` dan pakai HTTPS.
Di Swagger cukup jalankan login sekali; semua endpoint lain otomatis memakai cookie itu.

**Bentuk respons.** Semua endpoint JSON memakai amplop yang sama:

```jsonc
{ "statusCode": 200, "message": "Data retrieved successfully", "data": { /* isi */ } }
// galat:
{ "statusCode": 403, "message": "…", "data": null, "errors": { "code": "PASSWORD_CHANGE_REQUIRED" } }
```

`message` berupa array string bila validasi input gagal (`400`). `401` = belum masuk / sesi berakhir → arahkan ke `/masuk`.

**Bentuk data** mengikuti `src/lib/types.ts` di FE: id anggota = `username`, proyek = `slug`, tiket = `key`, divisi = `slug`, permintaan = `REQ-n`.
Tambahan dari BE: `ticket.sprintId`, `commentCount`, `attachmentCount`, `subtaskCount`, `project.ticketCount`, `attachment.id/url/uploaded`.
Daftar tiket (papan, backlog) tidak memuat `comments`, `attachments`, `links`; ambil dari detail tiket.

**Aksi store FE → endpoint**

| FE (`src/lib/store.tsx`) | Endpoint |
| --- | --- |
| data awal: `members`, `agents`, `divisions`, `projects` | `GET /members` · `GET /agents` · `GET /divisions` · `GET /projects` |
| papan / backlog proyek | `GET /projects/:slug/tickets?sprint=active\|backlog` |
| Tugas saya, Semua tiket | `GET /tickets?assignee=me` · `GET /tickets` |
| `createTicket` · `updateTicket` · `deleteTicket` | `POST /projects/:slug/tickets` · `PATCH /tickets/:key` · `DELETE /tickets/:key` |
| `moveTicket` (geser kartu) | `POST /tickets/:key/move` `{ status, beforeKey? }` |
| `bulkUpdate` · `bulkDelete` | `POST /tickets/bulk` · `POST /tickets/bulk-delete` |
| `addComment` | `POST /tickets/:key/comments` |
| `addCheck` · `toggleCheck` | `PUT /tickets/:key/checklist` (kirim seluruh daftar) |
| lampiran tiket | `POST /tickets/:key/attachments/upload` (multipart `file`) · `DELETE /tickets/:key/attachments/:id` |
| `createProject` · `updateProject` | `POST /projects` · `PATCH /projects/:slug` · `PUT /projects/:slug/members` · `PUT /projects/:slug/workflow` |
| `completeSprint` | `POST /projects/:slug/sprints/:id/complete` |
| `addEpic` | `POST /projects/:slug/epics` |
| `submitRequest` · `setRequestStatus` · `acceptRequest` · `rejectRequest` | `POST /requests` · `POST /requests/:code/review` · `…/accept` · `…/reject` |
| `createDoc` · `updateDoc` | `POST /docs` · `PATCH /docs/:slug` · `POST /docs/:slug/review` |
| `decideApproval` | `POST /approvals/:id/decide` |
| `markRead` · `markAllRead` | `POST /notifications/read` |
| `inviteMember` · `updateMember` · `updateEmployee` | `POST /members` · `PATCH /members/:username` · `PATCH /members/:username/employee` |
| `updateWorkspace` | `PATCH /workspace` |

| `sendMessage` · `openDm` · `createChannel` · `loadMessages` | `POST /conversations/:id/messages` · `POST /conversations/dm` · `POST /conversations` · `GET /conversations/:id/messages` |
| (aliran realtime di store) | `GET /events` (SSE) |

Belum ada di BE: Office, Pemakaian AI, Penagihan, balasan otomatis agent di percakapan.

## Realtime (SSE)

`GET /api/v1/events` adalah koneksi HTTP yang tetap terbuka (Server-Sent Events, cookie login yang sama). FE membukanya lewat `EventSource` setelah masuk.

| Kejadian | Isi | Dikirim ke |
| --- | --- | --- |
| `ready` | `{ online: [username] }` | pengguna yang baru tersambung |
| `presence` | `{ username, online }` | semua non-tamu; status Online = punya koneksi SSE aktif |
| `change` | `{ res: ticket\|project\|doc\|request\|approval\|run\|org, key?, project?, by }` | semua anggota non-tamu (tamu hanya untuk proyek tempat ia menjadi anggota); pelaku tidak menerima gaungnya sendiri |
| `notification` | `{ kind }` | penerima notifikasi |
| `chat` | `{ op: message\|message.edit\|message.delete\|read\|channel, conversationId, … }` | anggota percakapan (kanal publik: perubahan daftar kanal ke semua non-tamu) |

Isi kejadian hanya petunjuk. FE mengambil data terbarunya lewat endpoint biasa, sehingga pengecekan izin tidak terlewati.
Setiap permintaan tulis yang berhasil diumumkan otomatis oleh `RealtimeInterceptor`; modul baru tidak perlu menambah kode.
Koneksi dikirimi `: ping` tiap 20 detik, ditutup tiap 1 jam (browser menyambung ulang sendiri), dan dibatasi 5 tab per akun.

Cukup untuk satu instance BE (kejadian beredar di dalam proses). Bila BE dijalankan lebih dari satu, ganti isi `RealtimeBus` dengan Redis pub/sub;
pemanggilnya tidak berubah. Di Nginx Proxy Manager tidak perlu pengaturan khusus (BE mengirim `X-Accel-Buffering: no`).

## Percakapan

Kanal tim dan pesan langsung (DM), disimpan di Postgres dan dikirim ke anggota lewat SSE.

| Endpoint | Fungsi |
| --- | --- |
| `GET /conversations` | Kanal & DM saya (+ kanal publik yang belum diikuti), dengan jumlah belum dibaca |
| `POST /conversations` | Buat kanal `{ name, topic?, isPrivate?, memberIds?, project? }` |
| `POST /conversations/dm` | Buka/buat DM `{ username }` (manusia atau agent) |
| `PATCH · DELETE /conversations/:id` | Ubah / hapus kanal (pembuat, Admin, Owner) |
| `POST /conversations/:id/join` · `POST …/members` · `DELETE …/members/:username` | Gabung kanal publik, tambah anggota, keluar / keluarkan |
| `GET · POST /conversations/:id/messages` | Riwayat (`before`, `limit`) · kirim pesan (kanal publik: otomatis bergabung) |
| `PATCH · DELETE /conversations/:id/messages/:mid` | Ubah pesan sendiri · hapus (pengirim, Admin, Owner) |
| `POST /conversations/:id/read` | Tandai terbaca |

Kanal privat dan DM hanya terlihat anggotanya; Tamu tidak bisa membuat kanal atau DM dan hanya melihat kanal tempat ia diundang.
`@username` di pesan mengirim notifikasi mention ke anggota percakapan itu. Pesan ke agent tersimpan, tetapi agent belum membalas otomatis.

## Lampiran

`POST /tickets/:key/attachments/upload` dan `POST /requests/:code/attachments/upload` menerima `multipart/form-data` dengan field `file`
(batas `UPLOAD_MAX_MB`, bawaan 25 MB). Tautan luar (Drive, Figma) tetap lewat `POST /tickets/:key/attachments` dengan `{ name, size, url }`.

**Penyimpanan** dipilih lewat `STORAGE_DRIVER`:

- `local` — folder `UPLOAD_DIR` di server API (bawaan `./uploads`, tidak ikut git).
- `s3` — bucket Cloudflare R2 (atau S3/MinIO), isi `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
  Saat API mulai, log menampilkan `Lampiran disimpan di bucket "…"` bila bucket bisa diakses, atau galat bila kredensial salah.

Tiap lampiran mencatat tempat penyimpanannya, jadi file lama tetap bisa dibuka setelah `STORAGE_DRIVER` diganti.

**Susunan folder** (sama untuk lokal dan bucket):

```
proyek/{slug-proyek}/{KUNCI-TIKET}/gambar/…     png, jpg, gif, webp, svg, heic
proyek/{slug-proyek}/{KUNCI-TIKET}/dokumen/…    pdf, docx, xlsx, pptx, txt, md, csv
proyek/{slug-proyek}/{KUNCI-TIKET}/video/…      mp4, mov, webm
proyek/{slug-proyek}/{KUNCI-TIKET}/lainnya/…    zip, fig, dan lainnya
permintaan/{REQ-n}/{gambar|dokumen|video|lainnya}/…
```

Nama file: `{tanggal}-{jam}-{id acak}-{nama-asli-yang-dirapikan}`, mis.
`proyek/pinarak/PNR-142/dokumen/20261113-034512-3f9a1c2e-brd-final-v2.pdf`. Nama asli tetap tersimpan di database dan dipakai saat diunduh.

**Membuka file:** `attachment.url` → `GET /api/v1/attachments/:id/file`. File selalu lewat API (butuh sesi login, Tamu hanya proyeknya sendiri),
jadi bucket boleh tetap privat. Gambar, PDF, dan video tampil langsung; tipe lain selalu diunduh.

## Deploy (produksi)

Deploy otomatis lewat GitHub Actions (`.github/workflows/deploy.yml`) setiap push ke `main`, sama seperti Kasha:
kode di-upload ke VPS (`/home/dev/backend/garap-be`), `.env` ditulis dari secret, image di-build dengan Podman,
migrasi diterapkan, lalu container `garap-be` dijalankan ulang dengan `--network=host` di **port 3001**.
Database tidak ikut dibuat: pakai Postgres yang sudah ada di server (`127.0.0.1:5432`).

| Alamat | |
| --- | --- |
| API | `https://garap.kulidigital.cloud` → reverse proxy ke `http://127.0.0.1:3001` |
| FE | `https://garap.kulidigital.id` |
| Health | `https://garap.kulidigital.cloud/api/v1/health` → `{"status":"ok","database":"ok"}` |

### Sekali saja sebelum deploy pertama

1. **Database:** buat database kosong `garap_db` di Postgres server (migrasi membuat tabelnya).
2. **GitHub secrets** (Settings › Secrets and variables › Actions):

   | Secret | Isi |
   | --- | --- |
   | `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PASSPHRASE` | Sama dengan repo Kasha (user `dev`) |
   | `ENV_FILE` | Seluruh isi `.env.production.example` yang sudah diisi (secret: `openssl rand -base64 48`) |
   | `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_PASSWORD` | Akun Owner pertama. Dibuat hanya bila belum ada Owner; boleh dihapus setelah deploy pertama |

3. **Reverse proxy** (Nginx Proxy Manager): host `garap.kulidigital.cloud` → `http://127.0.0.1:3001`, SSL aktif,
   dan `client_max_body_size 25m;` (Advanced) agar unggahan lampiran tidak ditolak.

### Data demo

Actions › Deploy Garap Backend › Run workflow:
- centang **seed**: **menghapus semua data**, hanya akun Owner dari secret `OWNER_EMAIL`/`OWNER_NAME`/`OWNER_PASSWORD` yang tersisa;
- centang **demo**: **menghapus semua data** lalu mengisi data demo (password semua akun manusia `password123`).

Jangan dipakai setelah aplikasi dipakai sungguhan.

### Perintah manual di server

```bash
cd /home/dev/backend/garap-be
podman logs -f garap-be                                   # log API
curl http://127.0.0.1:3001/api/v1/health
podman run --rm --network=host --env-file .env garap-be:latest npx prisma migrate status
```

### Domain FE & API

Browser tidak memanggil `garap.kulidigital.cloud` langsung. FE punya proxy `/api/*` (route `src/app/api/[...path]/route.ts`
di repo FE) yang meneruskan request ke BE, sehingga cookie sesi menjadi milik `garap.kulidigital.id` dan berlaku di semua browser
(termasuk Safari & Firefox). Karena itu cukup `COOKIE_SAMESITE=lax` dan `COOKIE_DOMAIN` kosong.

Semua request lewat proxy tampak berasal dari IP Cloudflare. Agar batas login per IP & log audit memakai IP asli pengguna,
isi `PROXY_SECRET` di BE dan secret Worker `GARAP_PROXY_SECRET` di FE dengan nilai yang sama (`openssl rand -base64 32`).
Tanpa itu aplikasi tetap jalan; hanya pencatatan IP yang kurang akurat.

### Pengaman yang aktif di produksi

- Batas request per IP: 300/menit umum, 10/menit untuk login & ganti password (`429`). Ditambah kunci akun setelah 5x salah password.
- Header keamanan (helmet), cookie sesi `HttpOnly` + `Secure`, CORS hanya untuk `CORS_ORIGIN`.
- API menolak mulai bila `JWT_SECRET`/`JWT_REFRESH_SECRET` < 32 karakter, `CORS_ORIGIN` berisi `*`, atau `API_PUBLIC_URL` kosong.
- Swagger mati kecuali `SWAGGER_ENABLED=true`. Body request tidak dicatat di log; di lokal, password/token/API key disamarkan.
- `GET /api/v1/health` mengecek database (dipakai healthcheck container dan langkah akhir workflow deploy).

## Modul API

| Modul | Isi |
| --- | --- |
| `auth` | Masuk email + password, sesi, ganti password |
| `members`, `agents`, `divisions`, `positions` | Akun (password awal & reset), agent AI (pilih penyedia + model), divisi, izin |
| `ai-providers` | API key Anthropic, Gemini, Grok, OpenAI, OpenRouter, atau server sendiri (Ollama/vLLM). Key diuji ke penyedia lalu disimpan terenkripsi AES-256-GCM (`AI_KEY_SECRET`); FE hanya menerima 4 karakter terakhir |
| `projects` | Proyek dari template (software/kanban/kreatif/konten), anggota, alur kerja + WIP, sprint (selesaikan + carry-over), epic |
| `tickets`, `attachments` | Papan & backlog, geser kartu (`/move`), bulk, komentar (@mention), checklist, relasi, lampiran (unggah file / tautan), pemantau, sub-tugas |
| `requests` | Permintaan lintas divisi: kirim → tinjau → terima (jadi tiket) / tolak; tiket selesai → permintaan selesai |
| `docs` | BRD, SRS, arsitektur, notulen; Draf → Direview → Disetujui |
| `content`, `social` | Kalender konten, konten rutin (tiket dibuat otomatis H-n), publikasi per akun (draf → persetujuan → terjadwal → tayang), agent menulis caption/naskah dengan model AI-nya, statistik & laporan performa, akun YouTube/Instagram/Facebook/TikTok/LinkedIn/X (OAuth atau manual) |
| `approvals`, `runs` | Persetujuan tindakan agent, riwayat run agent |
| `notifications`, `audit` | Notifikasi per akun, log audit |
| `conversations` | Kanal tim & pesan langsung, pesan, belum dibaca |
| `events` | Aliran realtime (SSE) |

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
  seeder/            # index.ts (kosong + Owner), demo.ts (data demo), steps/*, demo/ disalin dari FE
src/
  common/            # guard, decorator, serializers (DB → JSON FE), konstanta
  config/
  modules/
    auth/ activity/ organization/ projects/ tickets/ files/ requests/ docs/ content/ ai/ workspace/ health/
```


## Agent runtime

Agent bekerja sungguhan lewat antrean berbasis Postgres (tabel `agent_jobs`, tanpa Redis) yang dijalankan di dalam proses API.

- **Pemicu**: tiket ditugaskan ke agent, agent di-@mention (tiket atau chat), komentar di tiket yang ia tangani, pesan langsung ke agent, keputusan persetujuan, atau tombol "Beri tugas" di profil agent (`POST /agent-runtime/:username/tasks`).
- **Mesin**: model Anthropic dengan tool use (baca/komentar/pindah/ubah/buat tiket, dokumen, kirim pesan, minta persetujuan, catat pelajaran). Agent hanya bekerja di proyek yang ia ikuti. Tindakan berisiko lewat `request_approval`.
- **Biaya**: tiap pemanggilan dicatat di `agent_usage`; anggaran bulanan di profil agent menghentikan agent bila habis. Tarif perkiraan per model di `agent-pricing.ts` (ubah dengan `AGENT_PRICE_USD_PER_MTOK="3,15"` dan `USD_IDR`).
- **Env**: `AGENT_RUNNER=false` mematikan mesin (mis. bila menjalankan lebih dari satu instance, cukup satu yang aktif), `AGENT_CONCURRENCY` (default 2), `AGENT_POLL_MS` (default 2000), `AGENT_MAX_STEPS` (default 12).
- Setup: hubungkan API key Anthropic di Pengaturan → Penyedia AI, rekrut agent, tambahkan ke proyek.
