import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { attachmentSelect, toAttachment } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { safeSegment, StorageService } from './storage.service';

/** Bentuk file dari multer (disimpan dulu sebagai file sementara). */
export interface UploadedDiskFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

/** Hanya tipe ini yang boleh tampil langsung di browser; sisanya selalu diunduh (cegah HTML/SVG berbahaya). */
const INLINE_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']);

export const attachmentKind = (name: string, mime = '') =>
  mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|heic)$/i.test(name)
    ? 'gambar'
    : mime === 'application/pdf' || /\.pdf$/i.test(name)
      ? 'pdf'
      : mime.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(name)
        ? 'video'
        : /\.(docx?|xlsx?|pptx?|txt|md|csv|odt|ods|key|pages|numbers)$/i.test(name)
          ? 'dokumen'
          : 'lainnya';

/** Folder per jenis file di dalam folder tiket/permintaan. PDF digabung dengan dokumen. */
const KIND_FOLDER: Record<string, string> = { gambar: 'gambar', pdf: 'dokumen', dokumen: 'dokumen', video: 'video', lainnya: 'lainnya' };

/**
 * Lokasi file di penyimpanan:
 *   proyek/{slug-proyek}/{KUNCI-TIKET}/{gambar|dokumen|video|lainnya}/…   lampiran tiket
 *   permintaan/{REQ-n}/{gambar|dokumen|video|lainnya}/…                   lampiran permintaan lintas divisi
 */
export type AttachmentPlace = { kind: 'ticket'; projectSlug: string; ticketKey: string } | { kind: 'request'; code: string };

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Simpan file yang baru diunggah sebagai lampiran tiket atau permintaan. */
  async attach(
    user: JwtPayload,
    file: UploadedDiskFile | undefined,
    target: { ticket_id: number } | { request_id: number; ticket_id?: number },
    place: AttachmentPlace,
  ) {
    if (!file) throw new BadRequestException('Sertakan file pada field "file" (multipart/form-data)');
    // multer membaca nama file sebagai latin1; kembalikan ke UTF-8 agar nama beraksen/emoji tidak rusak.
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/]/g, '_').slice(0, 200) || 'file';
    const mime = file.mimetype || 'application/octet-stream';
    const kind = attachmentKind(name, mime);
    const base = place.kind === 'ticket' ? `proyek/${safeSegment(place.projectSlug)}/${safeSegment(place.ticketKey)}` : `permintaan/${safeSegment(place.code)}`;
    const saved = await this.storage.put(file.path, mime, `${base}/${KIND_FOLDER[kind]}`, name);
    try {
      const row = await this.prisma.attachment.create({
        data: {
          ...target,
          name,
          size: file.size,
          kind,
          storage: saved.storage,
          storage_key: saved.key,
          mime,
          uploader_id: user.userId,
        },
        select: attachmentSelect,
      });
      return toAttachment(row);
    } catch (e) {
      await this.storage.remove(saved.storage, saved.key);
      throw e;
    }
  }

  /** Buang file sementara dari multer (request ditolak sebelum file disimpan). */
  async discard(file?: UploadedDiskFile) {
    await this.storage.removeTemp(file?.path);
  }

  /** Hapus file milik lampiran yang barisnya sudah dihapus. */
  async removeStored(a: { storage: string | null; storage_key: string | null }) {
    await this.storage.remove(a.storage, a.storage_key);
  }

  /** File untuk diunduh. Tamu hanya boleh membuka lampiran di proyek tempat ia menjadi anggota. */
  async open(user: JwtPayload, id: number) {
    const a = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: { select: { deleted_at: true, project: { select: { members: { where: { user_id: user.userId }, select: { id: true } } } } } },
        request: { select: { requester_id: true } },
      },
    });
    if (!a || !a.storage_key || a.ticket?.deleted_at) throw new NotFoundException('Lampiran tidak ditemukan');
    if (user.positionName === 'Tamu') {
      const allowed = a.ticket ? a.ticket.project.members.length > 0 : a.request?.requester_id === user.userId;
      if (!allowed) throw new ForbiddenException('Anda tidak punya akses ke lampiran ini');
    }
    const { stream, size } = await this.storage.open(a.storage, a.storage_key);
    const mime = a.mime ?? 'application/octet-stream';
    return { stream, size, name: a.name, mime, inline: INLINE_MIME.has(mime) };
  }
}
