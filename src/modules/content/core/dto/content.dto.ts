import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf,
} from 'class-validator';
import { CONTENT_FORMATS, SOCIAL_PLATFORMS } from '@common/constants/domain.constant';

export class ManualChannelDto {
  @ApiProperty({ enum: SOCIAL_PLATFORMS }) @IsIn(SOCIAL_PLATFORMS) platform: string;
  @ApiProperty({ example: 'Kuli Digital' }) @IsString() @MinLength(1) name: string;
  @ApiProperty({ example: '@kulidigital.id' }) @IsString() @MinLength(1) handle: string;
  @ApiPropertyOptional({ type: [String], example: ['konten-sosmed'] }) @IsOptional() @IsArray() @IsString({ each: true }) projects?: string[];
}

export class UpdateChannelDto {
  @ApiPropertyOptional({ enum: ['otomatis', 'manual'] }) @IsOptional() @IsIn(['otomatis', 'manual']) mode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() handle?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) projects?: string[];
}

export class ConnectQueryDto {
  @ApiPropertyOptional({ description: 'Slug proyek dipisah koma', example: 'konten-sosmed' }) @IsOptional() @IsString() projects?: string;
  @ApiPropertyOptional({ description: 'Path FE setelah selesai', example: '/pengaturan/sosmed' }) @IsOptional() @IsString() redirect?: string;
}

export class ScheduleDto {
  @ApiProperty({ example: 'Reels rutin' }) @IsString() @MinLength(2) @MaxLength(80) title: string;
  @ApiProperty({ enum: CONTENT_FORMATS }) @IsIn(CONTENT_FORMATS) format: string;
  @ApiProperty({ type: [Number], example: [1, 2] }) @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) channelIds: number[];
  @ApiProperty({ type: [Number], example: [2, 5], description: '0 = Minggu … 6 = Sabtu' }) @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) days: number[];
  @ApiProperty({ example: '19:00', description: 'Jam tayang WIB' }) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) time: string;
  @ApiPropertyOptional({ default: 3 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(30) leadDays?: number;
  @ApiPropertyOptional({ example: 'galih' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() assigneeId?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) checklist?: string[];
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateScheduleDto extends PartialType(ScheduleDto) {}

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-11-01' }) @IsDateString() from: string;
  @ApiProperty({ example: '2026-11-30' }) @IsDateString() to: string;
}

export class ContentFormatDto {
  @ApiPropertyOptional({ enum: CONTENT_FORMATS, nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsIn(CONTENT_FORMATS) format: string | null;
}

export class CreatePostDto {
  @ApiProperty() @Type(() => Number) @IsInt() channelId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional({ example: '2026-11-13T12:00:00.000Z' }) @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() scheduledAt?: string | null;
}

export class MarkPublishedDto {
  @ApiProperty({ example: 'https://www.linkedin.com/feed/update/urn:li:activity:123' }) @IsUrl({ require_protocol: true }) url: string;
}

export class MetricsDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) views: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) likes: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) comments: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) shares: number;
}

export class AgentDraftDto {
  @ApiProperty({ example: 'kirana', description: 'username agent anggota proyek' }) @IsString() agent: string;
  @ApiPropertyOptional({ example: 'Nada santai, sebut promo akhir tahun' }) @IsOptional() @IsString() @MaxLength(2000) instructions?: string;
}

export class AgentWriteDto extends AgentDraftDto {
  @ApiProperty({ enum: ['naskah', 'ide', 'hashtag', 'ringkasan'] }) @IsIn(['naskah', 'ide', 'hashtag', 'ringkasan']) task: string;
}
