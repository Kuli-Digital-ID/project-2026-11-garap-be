import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  name: process.env.APP_NAME,
  apiPrefix: process.env.API_PREFIX || 'api',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  publicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 4000}`).replace(/\/$/, ''),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  uploadMaxMb: parseInt(process.env.UPLOAD_MAX_MB ?? '25', 10),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
}));
