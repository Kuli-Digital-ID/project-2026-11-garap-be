import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { PRIORITIES, REQUEST_STATUSES, TICKET_TYPES } from '@common/constants/domain.constant';
import { AttachmentDto } from '@modules/tickets/core/dto/ticket.dto';

export class RequestQueryDto {
  @ApiPropertyOptional({ example: 'kreatif', description: 'Divisi tujuan' }) @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional({ enum: REQUEST_STATUSES }) @IsOptional() @IsIn(REQUEST_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: ['masuk', 'keluar'], description: 'masuk = ke divisi saya, keluar = yang saya ajukan' }) @IsOptional() @IsIn(['masuk', 'keluar']) box?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateRequestDto {
  @ApiProperty({ example: 'Ilustrasi empty state aplikasi Pinarak' }) @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiProperty() @IsString() detail: string;
  @ApiProperty({ example: 'kreatif' }) @IsString() division: string;
  @ApiProperty({ example: 'Ilustrasi', description: 'Salah satu requestKinds divisi tujuan' }) @IsString() kind: string;
  @ApiPropertyOptional({ enum: PRIORITIES, default: 'sedang' }) @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @ApiPropertyOptional({ example: '2026-11-20' }) @IsOptional() @IsDateString() due?: string;
  @ApiPropertyOptional({ type: [String], example: ['Figma › Pinarak › Empty states'] }) @IsOptional() @IsArray() @IsString({ each: true }) references?: string[];
  @ApiPropertyOptional({ type: [AttachmentDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AttachmentDto) attachments?: AttachmentDto[];
}

export class UpdateRequestDto extends PartialType(CreateRequestDto) {}

export class AcceptRequestDto {
  @ApiProperty({ example: 'brand-q4', description: 'Proyek divisi tujuan tempat tiket dibuat' }) @IsString() project: string;
  @ApiPropertyOptional({ example: 'dimas' }) @IsOptional() @IsString() assigneeId?: string;
  @ApiPropertyOptional({ enum: TICKET_TYPES }) @IsOptional() @IsIn(TICKET_TYPES) type?: string;
  @ApiPropertyOptional({ example: 'brief' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() inSprint?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class RejectRequestDto {
  @ApiProperty({ example: 'Sudah ada aset serupa di Drive › Brand › Ilustrasi' }) @IsString() @MinLength(3) note: string;
}
