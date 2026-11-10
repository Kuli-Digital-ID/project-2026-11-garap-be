import type { ContentFormat, ContentPost, ContentSchedule, SocialChannel } from "../types";

/** Akun sosmed workspace. "otomatis" = diposting lewat API; "manual" = tim memposting sendiri, Garap mengingatkan. */
export const socialChannels: SocialChannel[] = [
  { id: "ch-ig", platform: "instagram", name: "Kuli Digital", handle: "@kulidigital.id", mode: "otomatis", status: "terhubung", projects: ["konten-sosmed", "brand-q4"], addedBy: "mega", added: "2026-09-02T10:00" },
  { id: "ch-tt", platform: "tiktok", name: "Kuli Digital", handle: "@kulidigital", mode: "otomatis", status: "terhubung", projects: ["konten-sosmed"], addedBy: "mega", added: "2026-09-02T10:05" },
  { id: "ch-yt", platform: "youtube", name: "Kuli Digital", handle: "@kulidigital", mode: "otomatis", status: "terhubung", projects: ["konten-sosmed"], addedBy: "bhagas", added: "2026-09-10T14:00" },
  { id: "ch-li", platform: "linkedin", name: "Kuli Digital", handle: "Kuli Digital Indonesia", mode: "manual", status: "terhubung", projects: ["konten-sosmed"], addedBy: "mega", added: "2026-09-02T10:10" },
];

export const contentSchedules: ContentSchedule[] = [
  { id: "sc-reels", project: "konten-sosmed", title: "Reels rutin", format: "reels", channelIds: ["ch-ig", "ch-tt", "ch-yt"], days: [2, 5], time: "19:00", leadDays: 3, assigneeId: "galih", checklist: ["Naskah & hook (Kirana)", "Rekam / ambil footage", "Edit + subtitle", "Thumbnail & caption", "Ajukan jadwal tayang"], active: true },
  { id: "sc-yt", project: "konten-sosmed", title: "Video YouTube mingguan", format: "video", channelIds: ["ch-yt"], days: [1], time: "17:00", leadDays: 5, assigneeId: "galih", checklist: ["Outline & naskah", "Rekam", "Edit", "Thumbnail", "Judul, deskripsi & chapter", "Potong 2 Shorts (Raga)"], active: true },
  { id: "sc-li", project: "konten-sosmed", title: "Thread LinkedIn", format: "thread", channelIds: ["ch-li"], days: [4], time: "10:00", leadDays: 2, assigneeId: "reza", checklist: ["Draf (Kirana)", "Review Mega", "Posting manual"], active: true },
];

const m = (views: number, likes: number, comments: number, shares: number) => ({ views, likes, comments, shares });

/** Rencana publikasi per tiket konten (kunci tiket → konten). */
export const contentByTicket: Record<string, { format: ContentFormat; posts: ContentPost[]; scheduleId?: string }> = {
  "SOS-19": {
    format: "video",
    posts: [{ id: "p19-yt", channelId: "ch-yt", title: "Tur kantor 3D Kuli Digital: tempat manusia & AI bekerja bareng", caption: "Kami bikin kantor virtual 3D tempat tim dan 12 agent AI bekerja. Ini turnya.\n\n00:00 Pembuka\n01:10 Lantai 1: tim manusia\n03:40 Lantai 2: agent AI\n06:05 Cara kami mengawasi agent", scheduledAt: "2026-11-02T17:00", status: "tayang", approvedBy: "mega", publishedAt: "2026-11-02T17:00", url: "https://youtu.be/demo-tur3d", metrics: m(4820, 312, 47, 38) }],
  },
  "SOS-22": {
    format: "carousel",
    posts: [{ id: "p22-ig", channelId: "ch-ig", caption: "5 tips RSVP biar tamu nggak lupa 💌 Simpan dulu, kirim ke pasanganmu.\n\n#undangandigital #pinarak #tipsnikah", scheduledAt: "2026-11-11T19:00", status: "terjadwal", approvedBy: "mega" }],
  },
  "SOS-23": {
    format: "reels",
    posts: [
      { id: "p23-ig", channelId: "ch-ig", caption: "Kantor kami ada 2 lantai. Lantai 2 isinya… agent AI 👀", scheduledAt: "2026-11-14T19:00", status: "draf" },
      { id: "p23-tt", channelId: "ch-tt", caption: "POV: rekan kerjamu agent AI. #kantor #ai", scheduledAt: "2026-11-14T19:00", status: "draf" },
    ],
  },
  "SOS-24": {
    format: "thread",
    posts: [{ id: "p24-li", channelId: "ch-li", caption: "Bagaimana PT Sinar Abadi memangkas rekap absensi 640 karyawan dari 3 hari jadi 0 hari dengan absensi wajah + lokasi. 🧵", scheduledAt: "2026-11-06T10:00", status: "tayang", approvedBy: "mega", publishedAt: "2026-11-06T10:12", url: "https://www.linkedin.com/feed/update/urn:li:activity:demo24", metrics: m(2140, 96, 14, 9) }],
  },
  "SOS-25": {
    format: "carousel",
    posts: [
      { id: "p25-ig", channelId: "ch-ig", caption: "Pinarak resmi meluncur 🎉 Undangan digital dengan RSVP otomatis.", scheduledAt: "2026-10-28T19:00", status: "tayang", approvedBy: "mega", publishedAt: "2026-10-28T19:00", url: "https://www.instagram.com/p/demo25", metrics: m(6930, 512, 61, 88) },
      { id: "p25-tt", channelId: "ch-tt", caption: "Bikin undangan nikah 15 menit, RSVP langsung rekap. #pinarak", scheduledAt: "2026-10-28T19:00", status: "tayang", approvedBy: "mega", publishedAt: "2026-10-28T19:02", url: "https://www.tiktok.com/@kulidigital/video/demo25", metrics: m(18400, 1210, 96, 230) },
    ],
  },
  "SOS-27": {
    format: "reels",
    scheduleId: "sc-reels",
    posts: [
      { id: "p27-ig", channelId: "ch-ig", caption: "3 fitur Pinarak yang bikin WO hemat waktu ⏱️", scheduledAt: "2026-11-10T19:00", status: "terjadwal", approvedBy: "mega" },
      { id: "p27-tt", channelId: "ch-tt", caption: "WO kamu masih rekap RSVP manual? 😅 #pinarak", scheduledAt: "2026-11-10T19:00", status: "terjadwal", approvedBy: "mega" },
      { id: "p27-yt", channelId: "ch-yt", title: "3 fitur Pinarak untuk WO #shorts", caption: "Undangan digital + RSVP otomatis. #shorts", scheduledAt: "2026-11-10T19:00", status: "terjadwal", approvedBy: "mega" },
    ],
  },
  "SOS-28": {
    format: "reels",
    scheduleId: "sc-reels",
    posts: [
      { id: "p28-ig", channelId: "ch-ig", caption: "", scheduledAt: "2026-11-13T19:00", status: "draf" },
      { id: "p28-tt", channelId: "ch-tt", caption: "", scheduledAt: "2026-11-13T19:00", status: "draf" },
      { id: "p28-yt", channelId: "ch-yt", title: "", caption: "", scheduledAt: "2026-11-13T19:00", status: "draf" },
    ],
  },
  "SOS-29": {
    format: "video",
    scheduleId: "sc-yt",
    posts: [{ id: "p29-yt", channelId: "ch-yt", title: "Cara kami merekrut agent AI (dan mengawasinya)", caption: "", scheduledAt: "2026-11-16T17:00", status: "draf" }],
  },
  "SOS-30": {
    format: "thread",
    scheduleId: "sc-li",
    posts: [{ id: "p30-li", channelId: "ch-li", caption: "Kenapa kami mewajibkan persetujuan manusia untuk setiap pesan agent AI ke klien — dan apa yang terjadi setelah 3 bulan. 🧵\n\n1/ …", scheduledAt: "2026-11-12T10:00", status: "menunggu" }],
  },
};
