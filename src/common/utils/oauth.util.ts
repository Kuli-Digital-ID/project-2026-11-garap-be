import { createHash, randomBytes } from 'crypto';

export const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** PKCE: verifier acak + challenge S256 (dipakai OAuth akun sosmed). */
export const pkce = () => {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

export const randomState = () => b64url(randomBytes(24));

/** Hanya izinkan path relatif di FE (cegah open redirect). */
export const safeRedirect = (path?: string) =>
  path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/';
