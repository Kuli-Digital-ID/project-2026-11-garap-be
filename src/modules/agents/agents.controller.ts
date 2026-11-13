import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AgentRuntime } from './agent-runtime.service';

class AssignTaskDto {
  @IsString() @MinLength(2) @MaxLength(8000) prompt: string;
  @IsOptional() @IsString() ticketKey?: string;
}

@ApiTags('Agent runtime')
@Controller({ path: 'agent-runtime', version: '1' })
export class AgentsController {
  constructor(private readonly runtime: AgentRuntime) {}

  @Get('status')
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Status antrean & mesin agent' })
  status() {
    return this.runtime.status();
  }

  @Post(':username/tasks')
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  @ApiOperation({ summary: 'Beri tugas langsung ke agent (opsional dengan tiket)' })
  async assign(@GetUser() u: JwtPayload, @Param('username') username: string, @Body() dto: AssignTaskDto) {
    const r = await this.runtime.assign(u.userId, username, dto.prompt, dto.ticketKey);
    if (!r) throw new NotFoundException('Agent tidak ditemukan atau nonaktif');
    return r;
  }
}
