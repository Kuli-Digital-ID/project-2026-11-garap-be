import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsHexColor, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PROJECT_STATUSES, PROJECT_TEMPLATES, STATUS_CATEGORIES } from '@common/constants/domain.constant';

export class ProjectQueryDto {
  @ApiPropertyOptional({ enum: PROJECT_STATUSES }) @IsOptional() @IsIn(PROJECT_STATUSES) status?: string;
  @ApiPropertyOptional({ example: 'kreatif' }) @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional({ description: 'Hanya proyek tempat saya anggota' }) @IsOptional() @IsIn(['true', 'false']) mine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class WorkflowStatusDto {
  @ApiProperty({ example: 'qa', description: 'Kode status unik di proyek' }) @IsString() @Matches(/^[a-z0-9][a-z0-9-]*$/) @MaxLength(30) id: string;
  @ApiProperty({ example: 'QA' }) @IsString() @MinLength(1) @MaxLength(40) name: string;
  @ApiProperty({ enum: STATUS_CATEGORIES }) @IsIn(STATUS_CATEGORIES) category: string;
  @ApiProperty({ example: '#8B5CF6' }) @IsHexColor() color: string;
  @ApiPropertyOptional({ example: 3 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) wip?: number;
}

export class SprintInputDto {
  @ApiProperty({ example: 'Sprint 5' }) @IsString() @MinLength(1) name: string;
  @ApiProperty({ example: '2026-11-11' }) @IsDateString() start: string;
  @ApiProperty({ example: '2026-11-22' }) @IsDateString() end: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goal?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'Pinarak' }) @IsString() @MinLength(2) @MaxLength(80) name: string;
  @ApiPropertyOptional({ example: 'pinarak', description: 'Default dari nama' }) @IsOptional() @Matches(/^[a-z0-9][a-z0-9-]*$/) slug?: string;
  @ApiProperty({ example: 'PNR', description: 'Awalan kunci tiket' }) @Matches(/^[A-Z][A-Z0-9]{1,9}$/, { message: 'key: 2–10 huruf kapital/angka' }) key: string;
  @ApiProperty({ example: '#5E6AD2' }) @IsHexColor() color: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() client?: string;
  @ApiPropertyOptional({ enum: PROJECT_TEMPLATES, default: 'software' }) @IsOptional() @IsIn(PROJECT_TEMPLATES) template?: string;
  @ApiPropertyOptional({ enum: PROJECT_STATUSES, default: 'Perencanaan' }) @IsOptional() @IsIn(PROJECT_STATUSES) status?: string;
  @ApiPropertyOptional({ example: 'laras' }) @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional({ example: 'engineering' }) @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional({ type: [String], example: ['laras', 'ayu'] }) @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
  @ApiPropertyOptional({ type: [WorkflowStatusDto], description: 'Default mengikuti template' })
  @IsOptional() @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => WorkflowStatusDto) workflow?: WorkflowStatusDto[];
  @ApiPropertyOptional({ type: SprintInputDto, description: 'Sprint pertama (opsional)' })
  @IsOptional() @ValidateNested() @Type(() => SprintInputDto) sprint?: SprintInputDto;
  @ApiPropertyOptional({ example: '2026-11-10' }) @IsOptional() @IsDateString() start?: string;
  @ApiPropertyOptional({ example: '2027-01-31' }) @IsOptional() @IsDateString() target?: string;
}

export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['workflow', 'sprint', 'memberIds', 'template'] as const)) {}

export class MembersDto {
  @ApiProperty({ type: [String], example: ['dimas', 'galih'] }) @IsArray() @IsString({ each: true }) memberIds: string[];
}

export class WorkflowDto {
  @ApiProperty({ type: [WorkflowStatusDto] })
  @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => WorkflowStatusDto) workflow: WorkflowStatusDto[];

  @ApiPropertyOptional({ description: 'Pindahkan tiket dari status yang dihapus: { kodeLama: kodeBaru }', example: { qa: 'review' } })
  @IsOptional() remap?: Record<string, string>;
}

export class UpdateSprintDto extends PartialType(SprintInputDto) {
  @ApiPropertyOptional({ enum: ['rencana', 'aktif'] }) @IsOptional() @IsIn(['rencana', 'aktif']) state?: string;
}

export class CompleteSprintDto {
  @ApiPropertyOptional({ enum: ['backlog', 'next'], default: 'backlog', description: 'Tiket yang belum selesai dipindah ke backlog atau sprint berikutnya' })
  @IsOptional() @IsIn(['backlog', 'next']) carryOver?: 'backlog' | 'next';

  @ApiPropertyOptional({ type: SprintInputDto, description: 'Wajib bila carryOver=next' })
  @IsOptional() @ValidateNested() @Type(() => SprintInputDto) next?: SprintInputDto;
}

export class EpicDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty({ example: '#22A06B' }) @IsHexColor() color: string;
  @ApiPropertyOptional({ description: 'Minggu ke- pada linimasa' }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) start?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) weeks?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
}
export class UpdateEpicDto extends PartialType(EpicDto) {}
