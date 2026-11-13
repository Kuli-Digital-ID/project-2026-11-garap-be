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
    input_schema: obj({ key: str('kunci tiket'), title: str('judul baru'), description: str('deskripsi baru (menggantikan yang lama)'), priority: { type: 'string', enum: ['rendah', 'sedang', 'tinggi', 'mendesak'] }, assignee: str('username penerima tugas; kosongkan "" untuk melepas') }, ['key']),
  },
  {
    name: 'create_ticket',
    description: 'Buat tiket baru di proyek, mis. memecah pekerjaan besar menjadi tiket kecil.',
    input_schema: obj({ project: str('slug proyek'), title: str('judul'), description: str('deskripsi'), type: { type: 'string', enum: ['task', 'bug', 'story', 'dokumen', 'desain', 'konten'] }, priority: { type: 'string', enum: ['rendah', 'sedang', 'tinggi', 'mendesak'] }, assignee: str('username penerima tugas'), status: str('kode status awal') }, ['project', 'title']),
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
