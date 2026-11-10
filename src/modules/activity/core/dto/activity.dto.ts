import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { APPROVAL_KINDS, AUDIT_CATEGORIES, RISKS } from '@common/constants/domain.constant';

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AUDIT_CATEGORIES })
  @IsOptional()
  @IsIn(AUDIT_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ example: 'bhagas' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class MarkReadDto {
  @ApiPropertyOptional({ type: [Number], description: 'Kosongkan untuk menandai semua sudah dibaca' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];
}

export class ApprovalQueryDto {
  @ApiPropertyOptional({ enum: ['menunggu', 'disetujui', 'ditolak'] })
  @IsOptional()
  @IsIn(['menunggu', 'disetujui', 'ditolak'])
  status?: string;

  @ApiPropertyOptional({ example: 'pinarak' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({ example: 'raka' })
  @IsOptional()
  @IsString()
  agent?: string;
}

export class CreateApprovalDto {
  @ApiProperty({ example: 'pinarak' })
  @IsString()
  project: string;

  @ApiProperty({ enum: APPROVAL_KINDS })
  @IsIn(APPROVAL_KINDS)
  kind: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preview?: string;

  @ApiPropertyOptional({ enum: RISKS })
  @IsOptional()
  @IsIn(RISKS)
  risk?: string;
}

export class DecideApprovalDto {
  @ApiProperty({ enum: ['disetujui', 'ditolak'] })
  @IsIn(['disetujui', 'ditolak'])
  decision: 'disetujui' | 'ditolak';
}

export class RunQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() agent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() project?: string;
  @ApiPropertyOptional({ enum: ['berhasil', 'berjalan', 'gagal', 'menunggu'] })
  @IsOptional()
  @IsIn(['berhasil', 'berjalan', 'gagal', 'menunggu'])
  status?: string;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class IdsDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}
