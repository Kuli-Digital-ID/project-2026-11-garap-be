import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  /** local: folder UPLOAD_DIR · s3: Cloudflare R2 / S3 / MinIO */
  driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
  s3: {
    endpoint: (process.env.S3_ENDPOINT ?? '').replace(/\/$/, ''),
    /** R2 selalu "auto". */
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    /** Folder induk di dalam bucket (opsional), mis. "garap/". Kosong = langsung proyek/… dan permintaan/… */
    prefix: ((p) => (p && !p.endsWith('/') ? `${p}/` : p))((process.env.S3_PREFIX ?? '').replace(/^\/+/, '')),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },
}));
