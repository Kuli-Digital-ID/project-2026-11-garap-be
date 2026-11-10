import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ example: 'Kuli Digital' }) @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;

  @ApiPropertyOptional({ description: 'Data URL logo (image/png, jpeg, svg+xml, webp), maks. 512 KB; null untuk menghapus', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(/^data:image\/(png|jpeg|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/, { message: 'logo harus data URL gambar PNG/JPG/SVG/WebP' })
  @MaxLength(700_000, { message: 'Ukuran logo maksimal 512 KB' })
  logo?: string | null;

  @ApiPropertyOptional({ enum: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] }) @IsOptional() @IsIn(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']) timezone?: string;
  @ApiPropertyOptional({ enum: ['id', 'en'] }) @IsOptional() @IsIn(['id', 'en']) language?: string;
}
