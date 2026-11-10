import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsHexColor, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { AI_PROVIDERS, MEMBER_KINDS, MEMBER_STATUSES } from '@common/constants/domain.constant';
import { POSITION_NAMES } from '@common/constants/permissions.constant';

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const USERNAME = /^[a-z0-9][a-z0-9._-]*$/;

export class CreateDivisionDto {
  @ApiProperty({ example: 'kreatif' }) @IsString() @Matches(SLUG, { message: 'slug: huruf kecil, angka, dan tanda hubung' }) slug: string;
  @ApiProperty({ example: 'Creative & Design' }) @IsString() @MinLength(2) @MaxLength(80) name: string;
  @ApiProperty({ example: '#E07A5F' }) @IsHexColor() color: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: 'intan', description: 'username ketua divisi' }) @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional({ type: [String], example: ['Desain grafis', 'Ilustrasi'] }) @IsOptional() @IsArray() @IsString({ each: true }) requestKinds?: string[];
}
export class UpdateDivisionDto extends PartialType(CreateDivisionDto) {}

export class MemberQueryDto {
  @ApiPropertyOptional({ description: 'Cari nama, username, email, atau jabatan' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ example: 'engineering' }) @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional({ enum: MEMBER_KINDS }) @IsOptional() @IsIn(MEMBER_KINDS) kind?: string;
  @ApiPropertyOptional({ enum: POSITION_NAMES }) @IsOptional() @IsIn(POSITION_NAMES) access?: string;
  @ApiPropertyOptional({ description: 'Sertakan akun nonaktif' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeInactive?: boolean;
}

/** Owner/Admin mendaftarkan akun. Tidak ada pendaftaran mandiri. */
export class CreateMemberDto {
  @ApiProperty({ example: 'galih' }) @IsString() @Matches(USERNAME, { message: 'username: huruf kecil, angka, titik, garis bawah, tanda hubung' }) @MaxLength(40) username: string;
  @ApiProperty({ example: 'galih@kulidigital.id', description: 'Email kantor yang dipakai di Keycloak' }) @IsEmail() email: string;
  @ApiProperty({ example: 'Galih Pratama' }) @IsString() @MinLength(2) @MaxLength(80) fullName: string;
  @ApiPropertyOptional({ example: 'Galih', description: 'Nama panggilan; default kata pertama nama lengkap' }) @IsOptional() @IsString() @MaxLength(40) name?: string;
  @ApiPropertyOptional({ example: 'Motion & Video Editor' }) @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional({ example: 'Kreatif' }) @IsOptional() @IsString() team?: string;
  @ApiPropertyOptional({ example: 'kreatif' }) @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional({ enum: POSITION_NAMES.filter((p) => p !== 'Agent'), default: 'Anggota' }) @IsOptional() @IsIn(POSITION_NAMES.filter((p) => p !== 'Agent')) access?: string;
  @ApiPropertyOptional({ example: '#C7D2FE' }) @IsOptional() @IsHexColor() color?: string;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
  @ApiPropertyOptional({ enum: MEMBER_STATUSES }) @IsOptional() @IsIn(MEMBER_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() color?: string;
  @ApiPropertyOptional({ enum: MEMBER_STATUSES }) @IsOptional() @IsIn(MEMBER_STATUSES) status?: string;
}

export class CreateAgentDto {
  @ApiProperty({ example: 'kirana' }) @IsString() @Matches(USERNAME) @MaxLength(40) username: string;
  @ApiProperty({ example: 'Kirana' }) @IsString() @MinLength(2) name: string;
  @ApiProperty({ example: 'Agent QA' }) @IsString() role: string;
  @ApiPropertyOptional({ example: 'engineering' }) @IsOptional() @IsString() division?: string;
  @ApiProperty({ enum: AI_PROVIDERS, example: 'google' }) @IsIn(AI_PROVIDERS) provider: string;
  @ApiProperty({ example: 'gemini-2.5-pro', description: 'Id model di API penyedia' }) @IsString() @MinLength(1) modelId: string;
  @ApiPropertyOptional({ example: 'Gemini 2.5 Pro', description: 'Nama tampilan; default = modelId' }) @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional({ example: 150000, description: 'Kuota biaya per bulan (rupiah)' }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) budget?: number;
  @ApiProperty({ example: 'hendra', description: 'username penanggung jawab' }) @IsString() supervisorId: string;
}

export class UpdateAgentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional({ enum: AI_PROVIDERS, description: 'Ganti penyedia; wajib bersama modelId' }) @IsOptional() @IsIn(AI_PROVIDERS) provider?: string;
  @ApiPropertyOptional({ example: 'grok-4' }) @IsOptional() @IsString() @MinLength(1) modelId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorId?: string;
  @ApiPropertyOptional({ enum: MEMBER_STATUSES }) @IsOptional() @IsIn(MEMBER_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentTask?: string;
  @ApiPropertyOptional({ description: '[{ name, scope, mode }]' }) @IsOptional() @IsArray() @IsObject({ each: true }) tools?: object[];
  @ApiPropertyOptional({ description: '[{ title, body, source, date, pinned }]' }) @IsOptional() @IsArray() @IsObject({ each: true }) learnings?: object[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetPositionPermissionsDto {
  @ApiProperty({ type: [String], example: ['VIEW_PROJECT', 'ADD_TICKET'] }) @IsArray() @IsString({ each: true }) permissions: string[];
}

export class LimitDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
