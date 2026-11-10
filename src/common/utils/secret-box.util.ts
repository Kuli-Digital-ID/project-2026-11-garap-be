import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Enkripsi simetris AES-256-GCM untuk menyimpan rahasia (mis. API key penyedia AI) di database.
 * Kunci diturunkan dari env AI_KEY_SECRET. Format: base64(iv).base64(tag).base64(ciphertext)
 */
export class SecretBox {
  private static key() {
    const secret = process.env.AI_KEY_SECRET;
    if (!secret || secret.length < 16) throw new Error('AI_KEY_SECRET belum diatur (minimal 16 karakter)');
    return createHash('sha256').update(secret).digest();
  }

  static seal(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
  }

  static open(sealed: string): string {
    const [iv, tag, enc] = sealed.split('.').map((x) => Buffer.from(x, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
