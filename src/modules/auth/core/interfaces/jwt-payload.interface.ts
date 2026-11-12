/** Isi token. Hanya identitas; izin selalu dibaca ulang dari database. */
export interface TokenClaims {
  sub: number;
  /** token_version saat token dibuat. */
  tv: number;
}

/** Akun yang sedang masuk (request.user). */
export interface JwtPayload {
  userId: number;
  /** Handle anggota, mis. "bhagas" (id anggota di FE). */
  username: string;
  email: string;
  kind: string;
  positionId: number;
  positionName: string;
  permissions: string[];
  /** Masih memakai password awal/hasil reset: hanya boleh mengganti password. */
  mustChangePassword: boolean;
}
