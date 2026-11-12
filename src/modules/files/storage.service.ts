import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createReadStream, promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, extname, join, resolve, sep } from 'path';
import { Readable } from 'stream';

export type StorageDriver = 'local' | 's3';

/** 20261113-034512 (UTC) */
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/** Bagian nama folder yang aman: "Brand & Kampanye Q4" → "brand-kampanye-q4". */
export const safeSegment = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 60) || 'x';

/** Nama file yang aman dan mudah dibaca, ekstensi dipertahankan: "Catatan Rapat é.txt" → "catatan-rapat-e.txt". */
export const safeName = (name: string) => {
  const ext = extname(name).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
  const base = safeSegment(name.slice(0, name.length - extname(name).length)).toLowerCase().slice(0, 60);
  return `${base}${ext}`;
};

export interface S3Settings {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  forcePathStyle: boolean;
}

/**
 * Tempat menyimpan file lampiran.
 * - local: folder UPLOAD_DIR di server API.
 * - s3: bucket S3-compatible (Cloudflare R2, AWS S3, MinIO). Bucket boleh privat; file selalu dibuka lewat API
 *   sehingga pemeriksaan login & akses proyek tetap berlaku.
 * Tiap lampiran mencatat driver-nya, jadi file lama tetap terbaca setelah STORAGE_DRIVER diganti.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;

  constructor(private config: ConfigService) {}

  get driver(): StorageDriver {
    return this.config.get<StorageDriver>('storage.driver') ?? 'local';
  }

  private get localDir() {
    return resolve(this.config.get<string>('app.uploadDir') ?? './uploads');
  }

  private get s3cfg() {
    return this.config.get<S3Settings>('storage.s3')!;
  }

  private client() {
    if (!this.s3) {
      const c = this.s3cfg;
      this.s3 = new S3Client({
        endpoint: c.endpoint,
        region: c.region,
        forcePathStyle: c.forcePathStyle,
        credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      });
    }
    return this.s3;
  }

  /** Saat aplikasi mulai: pastikan bucket bisa dijangkau dengan kredensial yang diberikan (hanya peringatan). */
  async onModuleInit() {
    if (this.driver !== 's3') return;
    try {
      await this.client().send(new HeadBucketCommand({ Bucket: this.s3cfg.bucket }));
      this.logger.log(`Lampiran disimpan di bucket "${this.s3cfg.bucket}" (${new URL(this.s3cfg.endpoint).host})`);
    } catch (e) {
      this.logger.error(`Bucket "${this.s3cfg.bucket}" tidak bisa diakses: ${(e as Error).name} ${(e as Error).message}. Unggah lampiran akan gagal.`);
    }
  }

  /**
   * Simpan file sementara hasil multer ke penyimpanan aktif. File sementara selalu dihapus.
   * `folder` mis. "proyek/pinarak/PNR-142/gambar"; nama file diberi cap waktu + id acak agar tidak pernah bentrok:
   * proyek/pinarak/PNR-142/gambar/20261113-034512-3f9a1c2e-mockup-rsvp.png
   */
  async put(tempPath: string, mime: string, folder: string, originalName: string): Promise<{ storage: StorageDriver; key: string }> {
    const relKey = `${folder}/${stamp()}-${randomUUID().slice(0, 8)}-${safeName(originalName)}`;
    try {
      if (this.driver === 's3') {
        const { size } = await fs.stat(tempPath);
        const key = `${this.s3cfg.prefix}${relKey}`;
        await this.client().send(
          new PutObjectCommand({ Bucket: this.s3cfg.bucket, Key: key, Body: createReadStream(tempPath), ContentLength: size, ContentType: mime }),
        );
        return { storage: 's3', key };
      }
      const key = relKey;
      const target = this.localPath(key);
      await fs.mkdir(dirname(target), { recursive: true });
      await fs.rename(tempPath, target).catch(async (e) => {
        if (e.code !== 'EXDEV') throw e;
        await fs.copyFile(tempPath, target); // beda disk/partisi
      });
      return { storage: 'local', key };
    } finally {
      await this.removeTemp(tempPath);
    }
  }

  async open(storage: string | null, key: string): Promise<{ stream: Readable; size?: number }> {
    if (storage === 's3') {
      try {
        const r = await this.client().send(new GetObjectCommand({ Bucket: this.s3cfg.bucket, Key: key }));
        return { stream: r.Body as Readable, size: r.ContentLength };
      } catch (e) {
        if (e instanceof NoSuchKey || (e as { name?: string }).name === 'NoSuchKey') throw new NotFoundException('File lampiran sudah tidak ada di penyimpanan');
        throw e;
      }
    }
    const path = this.localPath(key);
    const stat = await fs.stat(path).catch(() => {
      throw new NotFoundException('File lampiran sudah tidak ada di server');
    });
    return { stream: createReadStream(path), size: stat.size };
  }

  /** Hapus file. Gagal menghapus hanya dicatat, tidak menggagalkan request. */
  async remove(storage: string | null, key?: string | null) {
    if (!key) return;
    try {
      if (storage === 's3') await this.client().send(new DeleteObjectCommand({ Bucket: this.s3cfg.bucket, Key: key }));
      else await fs.unlink(this.localPath(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.logger.warn(`Gagal menghapus file ${key}: ${(e as Error).message}`);
    }
  }

  async removeTemp(path?: string) {
    if (path) await fs.unlink(path).catch(() => undefined);
  }

  /** Cegah kunci seperti "../x" keluar dari folder unggahan. */
  private localPath(key: string) {
    const path = resolve(this.localDir, key);
    if (!path.startsWith(this.localDir + sep)) throw new NotFoundException('Lampiran tidak ditemukan');
    return path;
  }
}
