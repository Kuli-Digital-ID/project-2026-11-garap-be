import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';

export class BankDto {
  @ApiPropertyOptional({ example: 'BCA' }) @IsString() @MaxLength(40) name: string;
  @ApiPropertyOptional({ example: '5270-118-001' }) @Matches(/^[0-9 .-]{5,30}$/, { message: 'No. rekening hanya angka, spasi, titik, atau tanda hubung' }) account: string;
  @ApiPropertyOptional({ example: 'Bhagas Kuro' }) @IsString() @MaxLength(80) holder: string;
}

export class EmergencyDto {
  @ApiPropertyOptional() @IsString() @MaxLength(80) name: string;
  @ApiPropertyOptional({ example: 'Ibu' }) @IsString() @MaxLength(40) relation: string;
  @ApiPropertyOptional() @Matches(/^[0-9+ ()-]{6,20}$/) phone: string;
}

/** Kolom yang boleh diubah pemilik profil sendiri. */
export class UpdateMyEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) birthPlace?: string;
  @ApiPropertyOptional({ example: '1992-11-14' }) @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional({ enum: ['Laki-laki', 'Perempuan'] }) @IsOptional() @IsIn(['Laki-laki', 'Perempuan']) gender?: string;
  @ApiPropertyOptional({ example: '0812-1100-2026' }) @IsOptional() @Matches(/^[0-9+ ()-]{6,20}$/, { message: 'No. HP tidak valid' }) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() personalEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional({ description: '16 digit' }) @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(/^\d{16}$/, { message: 'NIK harus 16 digit' }) nik?: string;
  @ApiPropertyOptional({ example: '12.345.678.9-017.000' }) @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(/^[0-9.-]{15,25}$/, { message: 'Format NPWP tidak valid' }) npwp?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(/^\d{8,16}$/, { message: 'No. BPJS Kesehatan hanya angka' }) bpjsKesehatan?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_, v) => v !== '') @Matches(/^\d{8,16}$/, { message: 'No. BPJS Ketenagakerjaan hanya angka' }) bpjsKetenagakerjaan?: string;
  @ApiPropertyOptional({ type: BankDto }) @IsOptional() @ValidateNested() @Type(() => BankDto) bank?: BankDto;
  @ApiPropertyOptional({ type: EmergencyDto }) @IsOptional() @ValidateNested() @Type(() => EmergencyDto) emergency?: EmergencyDto;
}

/** Owner: semua kolom termasuk kepegawaian. */
export class UpdateEmployeeDto extends UpdateMyEmployeeDto {
  @ApiPropertyOptional({ example: 'KD-2026-014' }) @IsOptional() @Matches(/^[A-Z0-9-]{3,20}$/) employeeId?: string;
  @ApiPropertyOptional({ enum: ['Tetap', 'Kontrak', 'Magang', 'Freelance'] }) @IsOptional() @IsIn(['Tetap', 'Kontrak', 'Magang', 'Freelance']) employment?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() contractEnd?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ nullable: true, description: 'username atasan' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() managerId?: string | null;
  @ApiPropertyOptional({ enum: ['Kantor', 'Hybrid', 'Remote'] }) @IsOptional() @IsIn(['Kantor', 'Hybrid', 'Remote']) workLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) office?: string;
}
