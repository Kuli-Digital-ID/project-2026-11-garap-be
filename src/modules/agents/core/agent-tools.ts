import { APPROVAL_KINDS } from '@common/constants/domain.constant';
import { ToolSpec } from '@modules/ai/core/helpers/provider-clients';

const APPROVAL_KINDS_LIST = [...APPROVAL_KINDS];

const str = (description: string) => ({ type: 'string', description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required });

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'get_project',
    description: 'Info proyek: nama, status alur kerja (kode status untuk move_ticket), anggota, dan lead. Panggil ini sebelum memindahkan tiket bila belum tahu kode statusnya.',
    input_schema: obj({ project: str('slug proyek, mis. "pinarak"') }, ['project']),
  },
  {
    name: 'list_tickets',
    description: 'Daftar tiket di satu proyek (maks 30). Bisa disaring menurut status, penerima tugas, atau kata kunci.',
    input_schema: obj({ project: str('slug proyek'), status: str('kode status'), assignee: str('username, "me", atau "none"'), search: str('judul atau kunci'), sprint: str('"active", "backlog", atau "all" (default active)') }, ['project']),
  },
  {
    name: 'get_ticket',
    description: 'Detail satu tiket: deskripsi, status, penerima tugas, checklist, subtask, dan komentar.',
    input_schema: obj({ key: str('kunci tiket, mis. PNR-142') }, ['key']),
  },
  {
    name: 'comment_ticket',
    description: 'Tulis komentar di tiket (laporan progres, pertanyaan, hasil kerja). Gunakan @username untuk menyebut orang.',
    input_schema: obj({ key: str('kunci tiket'), text: str('isi komentar') }, ['key', 'text']),
  },
  {
    name: 'move_ticket',
    description: 'Pindahkan tiket ke status lain (kode status dari get_project). Pindahkan ke selesai hanya bila pekerjaannya benar-benar tuntas.',
    input_schema: obj({ key: str('kunci tiket'), status: str('kode status tujuan') }, ['key', 'status']),
  },
  {
    name: 'update_ticket',
    description: 'Ubah judul, deskripsi, prioritas, atau penerima tugas sebuah tiket.',
    input_schema: obj({ key: str('kunci tiket'), title: str('judul baru'), description: str('deskripsi baru (menggantikan yang lama)'), priority: { type: 'string', enum: ['rendah', 'sedang', 'tinggi', 'mendesak'] }, assignee: str('username penerima tugas; kosongkan "" untuk melepas'), epic: { type: 'integer', description: 'id epic (dari get_planning); 0 untuk melepas dari epic' }, due: str('tenggat YYYY-MM-DD; kosongkan "" untuk menghapus'), sprint: { type: 'string', enum: ['active', 'backlog'], description: '"active" = masukkan ke sprint aktif, "backlog" = keluarkan' } }, ['key']),
  },
  {
    name: 'create_ticket',
    description: 'Buat tiket baru di proyek, mis. memecah pekerjaan besar menjadi tiket kecil.',
    input_schema: obj({ project: str('slug proyek'), title: str('judul'), description: str('deskripsi'), type: { type: 'string', enum: ['task', 'bug', 'story', 'dokumen', 'desain', 'konten'] }, priority: { type: 'string', enum: ['rendah', 'sedang', 'tinggi', 'mendesak'] }, assignee: str('username penerima tugas'), status: str('kode status awal'), epic: { type: 'integer', description: 'id epic (dari get_planning)' }, due: str('tenggat YYYY-MM-DD'), sprint: { type: 'string', enum: ['active', 'backlog'], description: 'default active' } }, ['project', 'title']),
  },
  {
    name: 'get_planning',
    description: 'Lihat perencanaan proyek: semua sprint (id, tanggal, status) dan epic (id, minggu mulai, durasi, progres). Panggil sebelum membuat epic/sprint agar tidak ganda.',
    input_schema: obj({ project: str('slug proyek') }, ['project']),
  },
  {
    name: 'create_epic',
    description: 'Buat epic baru di linimasa proyek. start_week = minggu ke berapa dimulai (0 = minggu pertama proyek), weeks = durasi dalam minggu.',
    input_schema: obj({ project: str('slug proyek'), name: str('nama epic'), start_week: { type: 'integer', minimum: 0 }, weeks: { type: 'integer', minimum: 1 }, color: str('warna hex, mis. #22A06B (opsional)'), owner: str('username pemilik epic (opsional)') }, ['project', 'name']),
  },
  {
    name: 'update_epic',
    description: 'Ubah epic: nama, jadwal (start_week/weeks), progres 0-100, atau pemilik.',
    input_schema: obj({ project: str('slug proyek'), id: { type: 'integer', description: 'id epic' }, name: str('nama baru'), start_week: { type: 'integer', minimum: 0 }, weeks: { type: 'integer', minimum: 1 }, progress: { type: 'integer', minimum: 0, maximum: 100 }, owner: str('username pemilik') }, ['project', 'id']),
  },
  {
    name: 'create_sprint',
    description: 'Buat sprint baru. Bila belum ada sprint aktif, sprint ini langsung aktif; bila sudah ada, statusnya "rencana".',
    input_schema: obj({ project: str('slug proyek'), name: str('mis. "Sprint 1"'), start: str('tanggal mulai YYYY-MM-DD'), end: str('tanggal selesai YYYY-MM-DD'), goal: str('tujuan sprint (opsional)') }, ['project', 'name', 'start', 'end']),
  },
  {
    name: 'update_sprint',
    description: 'Ubah sprint yang belum selesai: nama, tujuan, tanggal, atau status ("rencana"/"aktif").',
    input_schema: obj({ project: str('slug proyek'), id: { type: 'integer', description: 'id sprint' }, name: str('nama baru'), goal: str('tujuan baru'), start: str('YYYY-MM-DD'), end: str('YYYY-MM-DD'), state: { type: 'string', enum: ['rencana', 'aktif'] } }, ['project', 'id']),
  },
  {
    name: 'list_docs',
    description: 'Daftar dokumen (BRD, SRS, notulen, dll.) di proyek.',
    input_schema: obj({ project: str('slug proyek') }),
  },
  {
    name: 'get_doc',
    description: 'Isi lengkap sebuah dokumen.',
    input_schema: obj({ slug: str('slug dokumen dari list_docs') }, ['slug']),
  },
  {
    name: 'create_doc',
    description: 'Buat dokumen baru di proyek. Isi dibagi menjadi bagian-bagian berjudul.',
    input_schema: obj({
      project: str('slug proyek'),
      title: str('judul dokumen (min. 3 huruf)'),
      kind: { type: 'string', enum: ['BRD', 'SRS', 'Arsitektur', 'Rencana', 'Notulen', 'Panduan'] },
      sections: { type: 'array', items: obj({ heading: str('judul bagian'), body: str('isi bagian') }, ['heading', 'body']) },
    }, ['project', 'title', 'kind', 'sections']),
  },
  {
    name: 'send_message',
    description: 'Kirim pesan langsung ke seorang anggota tim (untuk memberi kabar atau bertanya).',
    input_schema: obj({ username: str('username penerima'), text: str('isi pesan') }, ['username', 'text']),
  },
  {
    name: 'request_approval',
    description: 'Minta persetujuan manusia SEBELUM melakukan tindakan berisiko atau yang berdampak ke luar (kirim email, publikasi, menghapus, mengubah data penting). Setelah diajukan, hentikan pekerjaan tindakan itu dan tunggu keputusan.',
    input_schema: obj({
      project: str('slug proyek'),
      kind: { type: 'string', enum: APPROVAL_KINDS_LIST, description: 'jenis tindakan' },
      title: str('ringkasan singkat'),
      detail: str('alasan dan dampaknya'),
      preview: str('isi yang akan dikirim/dilakukan'),
      risk: { type: 'string', enum: ['rendah', 'sedang', 'tinggi'] },
    }, ['project', 'kind', 'title']),
  },
  {
    name: 'save_learning',
    description: 'Simpan pelajaran/preferensi yang berguna untuk pekerjaan berikutnya (mis. gaya penulisan klien, aturan tim). Jangan simpan rahasia atau data pribadi.',
    input_schema: obj({ title: str('judul singkat'), body: str('isi pelajaran') }, ['title', 'body']),
  },
];
