import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export class PasswordUtil {
  private static readonly SALT_ROUNDS = 10;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /** Password sementara yang mudah diketik (tanpa 0/O, 1/l/I): mis. "kfm7-Rq2x-9tbd". Selalu memuat huruf & angka. */
  static temporary(): string {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const pick = (set: string) => set[randomInt(set.length)];
    const group = () => {
      const chars = [pick(letters), pick(letters), pick(letters), pick(digits)];
      for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    };
    return `${group()}-${group()}-${group()}`;
  }
}
