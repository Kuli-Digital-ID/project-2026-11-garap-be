export interface JwtPayload {
  userId: number;
  /** Handle anggota, mis. "bhagas" (id anggota di FE). */
  username: string;
  email: string;
  kind: string;
  positionId: number;
  positionName: string;
  permissions: string[];
}
