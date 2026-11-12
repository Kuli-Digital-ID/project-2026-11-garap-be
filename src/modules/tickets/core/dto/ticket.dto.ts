import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUrl, Max, MaxLength, Min,
  MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { ATTACHMENT_KINDS, LINK_TYPES, PRIORITIES, TICKET_TYPES } from '@common/constants/domain.constant';

export class TicketQueryDto {
  @ApiPropertyOptional({ example: 'pinarak', description: 'Kosong = semua proyek yang boleh dilihat (Beranda, Semua tiket)' }) @IsOptional() @IsString() project?: string;
  @ApiPropertyOptional({ description: '"active" (sprint aktif), "backlog", "all", atau id sprint', example: 'active' }) @IsOptional() @IsString() sprint?: string;
  @ApiPropertyOptional({ example: 'progress', description: 'Kode status alur kerja' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ enum: ['todo', 'progress', 'review', 'done'] }) @IsOptional() @IsIn(['todo', 'progress', 'review', 'done']) category?: string;
  @ApiPropertyOptional({ example: 'me', description: 'username, "me", atau "none"' }) @IsOptional() @IsString() assignee?: string;
  @ApiPropertyOptional({ enum: TICKET_TYPES }) @IsOptional() @IsIn(TICKET_TYPES) type?: string;
  @ApiPropertyOptional({ enum: PRIORITIES }) @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() epic?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional({ description: 'Cari di judul atau kunci' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'Sertakan tiket dari sprint yang sudah ditutup' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeArchived?: boolean;
  @ApiPropertyOptional({ default: 500 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit?: number;
}

export class AgentNoteDto {
  @ApiProperty({ enum: ['working', 'warning', 'error', 'approval'] }) @IsIn(['working', 'warning', 'error', 'approval']) tone: string;
  @ApiProperty() @IsString() text: string;
}

export class ChecklistItemDto {
  @ApiProperty() @IsString() @MinLength(1) text: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() done?: boolean;
}

export class CreateTicketDto {
  @ApiProperty({ example: 'Halaman RSVP tamu' }) @IsString() @MinLength(1) @MaxLength(250) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TICKET_TYPES, default: 'task' }) @IsOptional() @IsIn(TICKET_TYPES) type?: string;
  @ApiPropertyOptional({ example: 'todo', description: 'Kode status; default status pertama alur kerja' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ enum: PRIORITIES, default: 'sedang' }) @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @ApiPropertyOptional({ example: 'ayu' }) @IsOptional() @IsString() assigneeId?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) points?: number | null;
  @ApiPropertyOptional({ example: '2026-11-20' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() due?: string | null;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() epicId?: number | null;
  @ApiPropertyOptional({ default: true, description: 'Masuk sprint aktif (false = backlog)' }) @IsOptional() @IsBoolean() inSprint?: boolean;
  @ApiPropertyOptional({ example: 'PNR-142', description: 'Jadikan sub-tugas dari tiket ini' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() parentKey?: string | null;
  @ApiPropertyOptional({ type: [ChecklistItemDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) checklist?: ChecklistItemDto[];
  @ApiPropertyOptional({ type: AgentNoteDto }) @IsOptional() @ValidateIf((_, v) => v !== null) @ValidateNested() @Type(() => AgentNoteDto) agentNote?: AgentNoteDto | null;
  @ApiPropertyOptional({ description: '{ branch, prs: [...], commits }' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsObject() dev?: object | null;
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({ description: 'Pindah ke sprint tertentu (id), null = backlog' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() sprintId?: number | null;
}

export class MoveTicketDto {
  @ApiProperty({ example: 'review', description: 'Kode status tujuan' }) @IsString() status: string;
  @ApiPropertyOptional({ description: 'Letakkan tepat sebelum tiket ini' }) @IsOptional() @IsString() beforeKey?: string;
  @ApiPropertyOptional({ description: 'Letakkan tepat sesudah tiket ini' }) @IsOptional() @IsString() afterKey?: string;
  @ApiPropertyOptional({ description: 'Atau langsung isi rank' }) @IsOptional() @IsNumber() rank?: number;
}

export class BulkPatchDto extends PickType(UpdateTicketDto, ['status', 'priority', 'assigneeId', 'type', 'epicId', 'sprintId', 'inSprint', 'labels'] as const) {}

export class BulkUpdateDto {
  @ApiProperty({ type: [String], example: ['PNR-142', 'PNR-143'] }) @IsArray() @ArrayNotEmpty() @ArrayMaxSize(200) @IsString({ each: true }) keys: string[];
  @ApiProperty({ type: BulkPatchDto }) @ValidateNested() @Type(() => BulkPatchDto) patch: BulkPatchDto;
}

export class BulkKeysDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayNotEmpty() @ArrayMaxSize(200) @IsString({ each: true }) keys: string[];
}

export class CommentDto {
  @ApiProperty({ example: 'Sudah saya cek, @ayu tolong review ya' }) @IsString() @MinLength(1) @MaxLength(10000) text: string;
}

export class ChecklistDto {
  @ApiProperty({ type: [ChecklistItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto) items: ChecklistItemDto[];
}

export class LinkDto {
  @ApiProperty({ enum: LINK_TYPES }) @IsIn(LINK_TYPES) type: string;
  @ApiProperty({ example: 'PNR-149' }) @IsString() key: string;
}

export class AttachmentDto {
  @ApiProperty({ example: 'mockup-rsvp.png' }) @IsString() @MinLength(1) name: string;
  @ApiProperty({ example: 245760, description: 'Ukuran dalam byte' }) @Type(() => Number) @IsInt() @Min(0) size: number;
  @ApiPropertyOptional({ enum: ATTACHMENT_KINDS }) @IsOptional() @IsIn(ATTACHMENT_KINDS) kind?: string;
  @ApiPropertyOptional({ description: 'URL file (Drive, Figma, S3, ...)' }) @IsOptional() @IsUrl({ require_tld: false }) url?: string;
}
