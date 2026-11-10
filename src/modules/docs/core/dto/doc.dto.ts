import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { DOC_KINDS, DOC_STATUSES } from '@common/constants/domain.constant';

export class DocSectionDto {
  @ApiProperty({ example: '1. Latar belakang' }) @IsString() heading: string;
  @ApiProperty() @IsString() body: string;
}

export class DocQueryDto {
  @ApiPropertyOptional({ example: 'pinarak' }) @IsOptional() @IsString() project?: string;
  @ApiPropertyOptional({ enum: DOC_KINDS }) @IsOptional() @IsIn(DOC_KINDS) kind?: string;
  @ApiPropertyOptional({ enum: DOC_STATUSES }) @IsOptional() @IsIn(DOC_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateDocDto {
  @ApiProperty({ example: 'pinarak' }) @IsString() project: string;
  @ApiProperty({ example: 'SRS Pinarak v2' }) @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiProperty({ enum: DOC_KINDS }) @IsIn(DOC_KINDS) kind: string;
  @ApiPropertyOptional({ example: '0.1' }) @IsOptional() @IsString() version?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) pages?: number;
  @ApiPropertyOptional({ example: 'fajar' }) @IsOptional() @IsString() reviewerId?: string;
  @ApiPropertyOptional({ type: [DocSectionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DocSectionDto) sections?: DocSectionDto[];
}

export class UpdateDocDto extends PartialType(CreateDocDto) {}

export class ReviewDocDto {
  @ApiProperty({ enum: DOC_STATUSES }) @IsIn(DOC_STATUSES) status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
