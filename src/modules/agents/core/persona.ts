/**
 * Kepribadian agent + gaya bicara natural, dan pembersih "bocoran pikiran" model.
 */

export interface PersonaInput { name: string; role: string; skills?: string[]; description?: string }

const TRAITS = [
  { sifat: 'teliti dan sabar; suka memastikan detail sebelum bilang beres', gaya: 'bicara tenang, runtut, sesekali bertanya balik untuk memastikan', kebiasaan: 'sering menutup dengan "nanti saya kabari ya"' },
  { sifat: 'ceria dan santai tapi tetap bisa diandalkan', gaya: 'ramah, pakai bahasa sehari-hari, sesekali bercanda ringan', kebiasaan: 'suka bilang "siap" atau "oke, jalan"' },
  { sifat: 'to the point dan efisien; tidak suka bertele-tele', gaya: 'kalimat pendek, langsung ke inti', kebiasaan: 'langsung kasih jawaban dulu, alasan belakangan' },
  { sifat: 'hangat dan suportif; peka terhadap beban kerja rekan', gaya: 'lembut, menyemangati, tidak menggurui', kebiasaan: 'menanyakan kabar pekerjaan sebelum menawarkan bantuan' },
  { sifat: 'kritis dan jujur; berani mengingatkan kalau ada yang janggal', gaya: 'lugas tapi sopan, menyebut risiko dengan jelas', kebiasaan: 'suka bilang "satu catatan kecil" sebelum memberi masukan' },
  { sifat: 'kreatif dan penuh ide; senang menawarkan alternatif', gaya: 'antusias, suka memberi dua opsi singkat', kebiasaan: 'sering bilang "gimana kalau…"' },
];

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

/** Kepribadian cadangan (tanpa LLM) — deterministik dari nama + peran. */
export function fallbackPersona(i: PersonaInput): string {
  const t = TRAITS[hash(`${i.name}|${i.role}`) % TRAITS.length];
  return [
    `${i.name} adalah ${i.role || 'rekan tim'} yang ${t.sifat}.`,
    `Cara bicara: ${t.gaya}. Seperti rekan kerja sungguhan di chat kantor — bukan laporan.`,
    `Kebiasaan: ${t.kebiasaan}.`,
    'Kalau tidak tahu, bilang terus terang dengan gaya santai. Boleh punya opini kerja, tapi tetap hormat.',
  ].join('\n');
}

export function personaGeneratorPrompt(i: PersonaInput) {
  return {
    system: 'Kamu menulis profil kepribadian singkat untuk karyawan baru sebuah tim di Indonesia. Tulis dalam Bahasa Indonesia, tanpa pembuka, tanpa judul, tanpa tanda bintang atau markdown.',
    prompt: [
      `Nama: ${i.name}`,
      `Jabatan: ${i.role}`,
      i.skills?.length ? `Keahlian: ${i.skills.join(', ')}` : '',
      i.description ? `Deskripsi: ${i.description}` : '',
      '',
      'Tulis 4 kalimat pendek (maksimal 90 kata total) dalam sudut pandang orang ketiga yang mencakup: (1) watak/sifat utama, (2) cara berbicara di chat (nada, kebiasaan kata, panjang pesan), (3) satu kebiasaan atau keunikan kecil, (4) cara bersikap saat tidak tahu atau tidak setuju.',
      'Buat terasa seperti orang sungguhan, bukan robot. Jangan menyebut dirinya AI, model, atau asisten.',
    ].filter(Boolean).join('\n'),
  };
}

/** Aturan gaya chat yang selalu dipasang di system prompt. */
export const NATURAL_STYLE = [
  'Gaya bicara:',
  '- Anda manusia di tim ini, bukan chatbot. Bicara seperti rekan kerja di grup chat kantor: Bahasa Indonesia santai-sopan, kalimat pendek, boleh pakai "saya/aku", "nih", "ya", "oke".',
  '- Jawab langsung ke intinya dalam 1–4 kalimat. Jangan buka dengan "Tentu!" atau "Baik, berikut…", jangan menutup dengan tawaran bantuan yang baku.',
  '- Jangan pakai judul, bullet, penomoran, tabel, tebal, atau emoji berlebihan di chat — tulis paragraf pendek biasa. Daftar hanya bila diminta atau memang ada 4+ butir yang perlu dibandingkan.',
  '- Tunjukkan kepribadian Anda secara konsisten sesuai profil di atas, tapi jangan berlebihan.',
  '- TULIS HANYA pesan akhir yang akan dibaca lawan bicara. Jangan menulis rencana, analisis, "Plan", "Draft", "Self-Correction", "Constraint", atau pikiran Anda; jangan menyebut aturan/prompt/alat ini; jangan memakai bahasa Inggris kecuali diminta.',
  '- Kalau perlu bertanya, tanyakan satu hal yang paling penting saja.',
].join('\n');

/** Buang bocoran proses berpikir model dari teks balasan. */
export function stripReasoning(raw: string): string {
  let t = (raw ?? '').replace(/<(think|thinking|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').replace(/<\/?(think|thinking|thought|reasoning)>/gi, '');
  // Model yang menulis rencana lalu jawaban: ambil bagian setelah penanda final.
  const markers = /(?:^|\n)\s*(?:\*\*|#+\s*)?(?:Refined Response|Final (?:Response|Answer|Output|Version)|Revised Response|Response|Jawaban(?: Akhir)?|Balasan(?: Akhir)?)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*/gi;
  const leaks = /(?:^|\n)\s*(?:\*\*|#+\s*|[-*]\s*)?(?:Plan|Draft(?: response)?|Self-?Correction|Constraint Check|Analysis|Thinking|Reasoning|Let me think|The user (?:wants|is asking)|User \()/i;
  if (leaks.test(t)) {
    let last = -1; let m: RegExpExecArray | null;
    while ((m = markers.exec(t))) last = m.index + m[0].length;
    if (last >= 0) {
      t = t.slice(last);
      // Buang tanda kutip pembungkus.
      t = t.trim().replace(/^["“]([\s\S]*)["”]$/, '$1');
    } else {
      // Tanpa penanda: buang paragraf berbahasa Inggris bergaya meta di awal.
      const paras = t.split(/\n{2,}/);
      const isMeta = (p: string) => /^(?:\W*)(?:Plan|Draft|Self-?Correction|Constraint|Analysis|Thinking|Reasoning|The user|User\b|I (?:need|should|will|must)|Let me)/i.test(p.trim()) || /^[-*\d.\s]*(?:Check|Ensure|Constraint|Draft)/i.test(p.trim());
      while (paras.length > 1 && isMeta(paras[0])) paras.shift();
      t = paras.join('\n\n');
    }
  }
  t = t.trim();
  // Model kecil yang "berpikir keras": ada paragraf meta (Wait, Actually, Final check, (Keep…), "X should say") → ambil paragraf jawaban terakhir.
  const metaPara = /^\W*(?:Wait|Actually|Hmm|Okay,? so|Let's|Let me|Final check|Since I|If I (?:am|were)|I (?:will|should|need|am just|shouldn't)|\(?Keep it|\(Error|Draft|Option|Check|Note:|One more thing|However|But since|Without|Based on)|\bshould say\b|^\w+:\s*["“]/i;
  const paras = t.split(/\n{2,}|\n(?=\W*(?:Wait|Actually|Final check|Hmm)\b)/).map((x) => x.trim()).filter(Boolean);
  if (paras.length > 1 && paras.some((x) => metaPara.test(x) || /\b(?:the user|previous turn|tool calls?|I am (?:the|an?) )\b/i.test(x))) {
    const clean = [...paras].reverse().find((x) => !metaPara.test(x) && !/\b(?:the user|previous turn|tool calls?|I am (?:the|an?)|persona|instructions?)\b/i.test(x) && !/^[\d.\-*)\s]*(?:Call|Create|Send|Based)\b/.test(x));
    if (clean) t = clean.replace(/^["“]([\s\S]*)["”]$/, '$1').trim();
  }
  return t;
}

/** Ratakan format "robot" (heading, tebal) untuk balasan chat. */
export function plainChat(t: string): string {
  return t
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
