import { ApiProperty } from '@nestjs/swagger';

export class MeDto {
  @ApiProperty({ example: 'bhagas', description: 'username; dipakai FE sebagai id anggota' }) id: string;
  @ApiProperty() userId: number;
  @ApiProperty() name: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiProperty() kind: string;
  @ApiProperty() role: string;
  @ApiProperty({ nullable: true }) division: string | null;
  @ApiProperty() initials: string;
  @ApiProperty({ example: 'Owner', description: 'Posisi/peran: Owner | Admin | Anggota | Tamu' }) access: string;
  @ApiProperty({ type: [String], example: ['VIEW_PROJECT', 'ADD_TICKET'] }) permissions: string[];
  @ApiProperty({ description: 'true = arahkan ke halaman ganti password; endpoint lain menolak dengan 403 PASSWORD_CHANGE_REQUIRED' })
  mustChangePassword: boolean;
}

export class SessionDto {
  @ApiProperty({ description: 'Sama dengan isi cookie "Authentication". Pakai sebagai Bearer bila FE tidak bisa memakai cookie.' })
  accessToken: string;
  @ApiProperty({ example: '2026-11-20T03:00:00.000Z' }) expiresAt: string;
  @ApiProperty({ type: MeDto }) user: MeDto;
}

export class LogoutResponseDto {
  @ApiProperty() loggedOut: boolean;
}
