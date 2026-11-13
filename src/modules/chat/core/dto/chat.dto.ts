import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'engineering', description: 'Huruf kecil, angka, dan tanda hubung (diubah otomatis)' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({ example: 'Arsitektur, deploy, code review' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({ description: 'Privat: hanya terlihat anggotanya', default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['raka', 'nadia'], description: 'Username anggota awal (pembuat otomatis ikut)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  memberIds?: string[];

  @ApiPropertyOptional({ example: 'pinarak', description: 'Kaitkan dengan proyek; bila memberIds kosong, anggota proyek ikut masuk' })
  @IsOptional()
  @IsString()
  project?: string;
}

export class UpdateChannelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class DirectDto {
  @ApiProperty({ example: 'raka', description: 'Username lawan bicara (manusia atau agent)' })
  @IsString()
  username: string;
}

export class AddMembersDto {
  @ApiProperty({ type: [String], example: ['dewi'] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  usernames: string[];
}

export class MessagesQueryDto {
  @ApiPropertyOptional({ description: 'Ambil pesan yang lebih lama dari id ini (untuk menggulir ke atas)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SendMessageDto {
  @ApiProperty({ example: 'Pagi semua! @raka tolong cek PNR-138 ya.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;

  @ApiPropertyOptional({ example: { kind: 'ticket', title: 'PNR-135 · Dokumen requirement v1', sub: 'Review', href: '/proyek/pinarak/tiket/PNR-135' } })
  @IsOptional()
  @IsObject()
  card?: Record<string, unknown>;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;
}

export class ReadDto {
  @ApiPropertyOptional({ description: 'Tandai sampai id pesan ini; kosong = sampai pesan terbaru' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  upTo?: number;
}
