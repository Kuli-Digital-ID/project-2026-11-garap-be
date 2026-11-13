import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(4000),
  APP_NAME: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  // Di produksi wajib panjang & acak: openssl rand -base64 48
  JWT_SECRET: Joi.string().required().when('NODE_ENV', { is: 'production', then: Joi.string().min(32) }),
  JWT_EXPIRATION: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required().when('NODE_ENV', { is: 'production', then: Joi.string().min(32) }),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

  // CORS: satu atau beberapa alamat FE dipisah koma
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .when('NODE_ENV', { is: 'production', then: Joi.string().pattern(/^[^*]+$/, 'tanpa *').required() }),
  // Batas request per IP per menit (login: 10/menit). TRUST_PROXY=1 bila API di belakang satu reverse proxy.
  RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(10).default(300),
  AUTH_RATE_LIMIT_PER_MINUTE: Joi.number().integer().min(1).default(10),
  TRUST_PROXY: Joi.string().default('false'),
  // Sama dengan GARAP_PROXY_SECRET di FE: IP asli pengguna diteruskan oleh proxy /api FE. Minimal 24 karakter.
  PROXY_SECRET: Joi.string().min(24).allow('').optional(),

  // API
  API_PREFIX: Joi.string().default('api'),


  // Alamat FE (tujuan redirect setelah menghubungkan akun sosmed)
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Login email + password
  AUTH_MAX_FAILED_LOGINS: Joi.number().integer().min(1).default(5),
  AUTH_LOCK_MINUTES: Joi.number().integer().min(1).default(15),
  /** lax untuk FE & API satu situs; none bila beda situs (wajib HTTPS). */
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_DOMAIN: Joi.string().allow('').optional(),

  // Lampiran yang diunggah
  UPLOAD_DIR: Joi.string().default('./uploads'),
  UPLOAD_MAX_MB: Joi.number().min(1).max(1024).default(25),
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  // Wajib bila STORAGE_DRIVER=s3 (Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com, region auto)
  S3_ENDPOINT: Joi.string().uri().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.allow('').optional() }),
  S3_BUCKET: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.allow('').optional() }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.allow('').optional() }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.allow('').optional() }),
  S3_REGION: Joi.string().default('auto'),
  S3_PREFIX: Joi.string().allow('').default(''),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),

  // Kunci enkripsi API key penyedia AI (Gemini, Grok, OpenAI, ...). Jangan diganti setelah ada key tersimpan.
  AI_KEY_SECRET: Joi.string().min(16).required(),

  // Alamat publik API (untuk callback OAuth sosmed), mis. https://api-garap.kulidigital.id
  // Wajib di produksi: dipakai untuk URL unduh lampiran, mis. https://api.garap.kulidigital.id
  API_PUBLIC_URL: Joi.string().uri().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
  // Pekerja latar konten (jadwal rutin, tayang terjadwal, statistik). false bila >1 instance.
  CONTENT_RUNNER: Joi.boolean().default(true),

  // Aplikasi developer tiap platform sosmed (kosong = platform itu hanya bisa mode manual)
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  META_APP_ID: Joi.string().allow('').optional(),
  META_APP_SECRET: Joi.string().allow('').optional(),
  TIKTOK_CLIENT_KEY: Joi.string().allow('').optional(),
  TIKTOK_CLIENT_SECRET: Joi.string().allow('').optional(),
  LINKEDIN_CLIENT_ID: Joi.string().allow('').optional(),
  LINKEDIN_CLIENT_SECRET: Joi.string().allow('').optional(),
  X_CLIENT_ID: Joi.string().allow('').optional(),
  X_CLIENT_SECRET: Joi.string().allow('').optional(),
  /** public | unlisted | private. Sebelum lolos audit Google, unggahan API tetap private. */
  YOUTUBE_PRIVACY: Joi.string().valid('public', 'unlisted', 'private').default('public'),
  /** SELF_ONLY sampai aplikasi TikTok lolos audit, lalu PUBLIC_TO_EVERYONE. */
  TIKTOK_PRIVACY: Joi.string().default('SELF_ONLY'),

  // Swagger
  // Bawaan: aktif di lokal, mati di produksi
  SWAGGER_ENABLED: Joi.boolean().allow('').optional(),
  SWAGGER_PATH: Joi.string().default('api-docs'),
});
