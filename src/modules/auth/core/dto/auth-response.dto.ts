import { ApiProperty } from '@nestjs/swagger';

export class AuthConfigDto {
  @ApiProperty({ description: 'Login lewat SSO Keycloak tersedia' })
  sso: boolean;

  @ApiProperty({ description: 'Login email + password (hanya pengembangan lokal)' })
  passwordLogin: boolean;

  @ApiProperty({ example: 'https://sso.kulidigital.id/realms/kulidigital', nullable: true })
  issuer: string | null;
}

export class MeDto {
  @ApiProperty({ example: 'bhagas' }) id: string;
  @ApiProperty() userId: number;
  @ApiProperty() name: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiProperty() kind: string;
  @ApiProperty() role: string;
  @ApiProperty({ nullable: true }) division: string | null;
  @ApiProperty() initials: string;
  @ApiProperty({ example: 'Owner' }) access: string;
  @ApiProperty({ type: [String] }) permissions: string[];
}

export class LogoutResponseDto {
  @ApiProperty({ nullable: true, description: 'Buka URL ini untuk keluar juga dari sesi Keycloak' })
  logoutUrl: string | null;
}
