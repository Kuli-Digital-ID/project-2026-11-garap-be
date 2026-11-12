import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  /** Salah password berturut-turut sebelum akun dikunci sementara. */
  maxFailedLogins: parseInt(process.env.AUTH_MAX_FAILED_LOGINS ?? '5', 10),
  lockMinutes: parseInt(process.env.AUTH_LOCK_MINUTES ?? '15', 10),
  cookie: {
    /** lax: FE & API satu situs (mis. app.domain.id + api.domain.id). none: beda situs (wajib HTTPS). */
    sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
    /** Mis. ".kulidigital.id" agar cookie terbaca di subdomain FE & API. Kosong = host API saja. */
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
}));
