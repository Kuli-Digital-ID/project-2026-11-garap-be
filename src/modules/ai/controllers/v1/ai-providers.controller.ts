import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AiProvidersService } from '../../ai-providers.service';
import { ConnectAiProviderDto } from '../../core/dto/ai-provider.dto';

@ApiTags('AI Providers')
@Controller({ path: 'ai-providers', version: '1' })
export class AiProvidersController {
  constructor(private readonly service: AiProvidersService) {}

  @Get()
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Penyedia AI (Anthropic, Gemini, Grok, OpenAI, OpenRouter, server sendiri) dan status koneksinya' })
  list() {
    return this.service.list();
  }

  @Put(':provider')
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  @ApiOperation({ summary: 'Hubungkan / ganti API key. Key diuji ke penyedia lalu disimpan terenkripsi.' })
  connect(@GetUser() u: JwtPayload, @Param('provider') provider: string, @Body() dto: ConnectAiProviderDto) {
    return this.service.connect(u, provider, dto);
  }

  @Post(':provider/test')
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  @ApiOperation({ summary: 'Uji ulang key tersimpan & perbarui daftar model' })
  test(@GetUser() u: JwtPayload, @Param('provider') provider: string) {
    return this.service.test(u, provider);
  }

  @Get(':provider/models')
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Id model yang tersedia dari penyedia ini' })
  models(@Param('provider') provider: string) {
    return this.service.models(provider);
  }

  @Delete(':provider')
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  @ApiOperation({ summary: 'Putuskan penyedia (ditolak bila masih dipakai agent)' })
  disconnect(@GetUser() u: JwtPayload, @Param('provider') provider: string) {
    return this.service.disconnect(u, provider);
  }
}
