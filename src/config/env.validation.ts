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
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),

  // API
  API_PREFIX: Joi.string().default('api'),


  // Frontend (tujuan redirect setelah login SSO)
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Login
  /** Login email + password hanya untuk pengembangan lokal. Produksi wajib SSO. */
  AUTH_PASSWORD_LOGIN: Joi.boolean().default(false),

  // SSO Keycloak (OIDC). Kosongkan bila belum ada Keycloak; tombol SSO akan nonaktif.
  KEYCLOAK_ISSUER: Joi.string().uri().allow('').optional(),
  KEYCLOAK_CLIENT_ID: Joi.string().allow('').optional(),
  KEYCLOAK_CLIENT_SECRET: Joi.string().allow('').optional(),
  /** URL callback BE yang didaftarkan di client Keycloak. */
  KEYCLOAK_REDIRECT_URI: Joi.string().uri().allow('').optional(),

  // Kunci enkripsi API key penyedia AI (Gemini, Grok, OpenAI, ...). Jangan diganti setelah ada key tersimpan.
  AI_KEY_SECRET: Joi.string().min(16).required(),

  // Alamat publik API (untuk callback OAuth sosmed), mis. https://api-garap.kulidigital.id
  API_PUBLIC_URL: Joi.string().uri().optional(),
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
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('api-docs'),
});
