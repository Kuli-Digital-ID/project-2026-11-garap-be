import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  // Tidak diisi → aktif di lokal, mati di produksi.
  enabled: process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : process.env.NODE_ENV !== 'production',
  path: process.env.SWAGGER_PATH || 'docs',
}));
