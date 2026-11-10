import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class ConnectAiProviderDto {
  @ApiPropertyOptional({ example: 'AIza…', description: 'Wajib kecuali penyedia "compatible" (server sendiri)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional({ example: 'http://localhost:11434/v1', description: 'Wajib untuk "compatible"; opsional untuk lainnya (proxy/gateway)' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  baseUrl?: string;
}
