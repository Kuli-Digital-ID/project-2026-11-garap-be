import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { WorkspaceService } from '../../workspace.service';
import { UpdateWorkspaceDto } from '../../core/dto/workspace.dto';

@ApiTags('Workspace')
@Controller({ path: 'workspace', version: '1' })
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Public()
  @Get('branding')
  @ApiOperation({ summary: 'Nama & logo perusahaan (dipakai juga di halaman masuk)' })
  branding() {
    return this.workspace.branding();
  }

  @Get()
  @ApiOperation({ summary: 'Pengaturan umum' })
  get() {
    return this.workspace.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Ubah pengaturan umum (Owner & Admin)' })
  update(@GetUser() u: JwtPayload, @Body() dto: UpdateWorkspaceDto) {
    return this.workspace.update(u, dto);
  }
}
