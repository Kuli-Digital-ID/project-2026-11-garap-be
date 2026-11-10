import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { OrganizationService } from '../../organization.service';
import {
  CreateAgentDto, CreateDivisionDto, CreateMemberDto, MemberQueryDto, SetPositionPermissionsDto, UpdateAgentDto, UpdateDivisionDto, UpdateMemberDto,
  UpdateMyProfileDto,
} from '../../core/dto/organization.dto';

@ApiTags('Divisions')
@Controller({ path: 'divisions', version: '1' })
export class DivisionsController {
  constructor(private readonly org: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Semua divisi (dipakai juga di form Permintaan)' })
  list() {
    return this.org.divisions();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.org.division(slug);
  }

  @Post()
  @Permissions(PERMISSIONS.DIVISION.ADD)
  create(@GetUser() u: JwtPayload, @Body() dto: CreateDivisionDto) {
    return this.org.createDivision(u, dto);
  }

  @Patch(':slug')
  @Permissions(PERMISSIONS.DIVISION.UPDATE)
  update(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: UpdateDivisionDto) {
    return this.org.updateDivision(u, slug, dto);
  }

  @Delete(':slug')
  @Permissions(PERMISSIONS.DIVISION.DELETE)
  remove(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.org.removeDivision(u, slug);
  }
}

@ApiTags('Members')
@Controller({ path: 'members', version: '1' })
export class MembersController {
  constructor(private readonly org: OrganizationService) {}

  @Get()
  @Permissions(PERMISSIONS.USER.VIEW)
  @ApiOperation({ summary: 'Daftar anggota (manusia & agent) dengan filter' })
  list(@Query() q: MemberQueryDto) {
    return this.org.members(q);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Ubah profil sendiri (nama panggilan, warna, status)' })
  updateMe(@GetUser() u: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.org.updateMe(u, dto);
  }

  @Get(':username')
  @Permissions(PERMISSIONS.USER.VIEW)
  get(@Param('username') username: string) {
    return this.org.member(username);
  }

  @Post()
  @Permissions(PERMISSIONS.USER.ADD)
  @ApiOperation({ summary: 'Daftarkan akun anggota (login lewat SSO dengan email ini)' })
  create(@GetUser() u: JwtPayload, @Body() dto: CreateMemberDto) {
    return this.org.createMember(u, dto);
  }

  @Patch(':username')
  @Permissions(PERMISSIONS.USER.UPDATE)
  update(@GetUser() u: JwtPayload, @Param('username') username: string, @Body() dto: UpdateMemberDto) {
    return this.org.updateMember(u, username, dto);
  }

  @Delete(':username')
  @Permissions(PERMISSIONS.USER.DELETE)
  remove(@GetUser() u: JwtPayload, @Param('username') username: string) {
    return this.org.removeMember(u, username);
  }
}

@ApiTags('Agents')
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(private readonly org: OrganizationService) {}

  @Get()
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Agent AI beserta profil, kuota, dan tools' })
  list() {
    return this.org.agents();
  }

  @Post()
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  create(@GetUser() u: JwtPayload, @Body() dto: CreateAgentDto) {
    return this.org.createAgent(u, dto);
  }

  @Patch(':username')
  @Permissions(PERMISSIONS.AGENT.MANAGE)
  update(@GetUser() u: JwtPayload, @Param('username') username: string, @Body() dto: UpdateAgentDto) {
    return this.org.updateAgent(u, username, dto);
  }
}

@ApiTags('Access')
@Controller({ version: '1' })
export class AccessController {
  constructor(private readonly org: OrganizationService) {}

  @Get('positions')
  @Permissions(PERMISSIONS.POSITION.VIEW)
  @ApiOperation({ summary: 'Posisi (Owner/Admin/Anggota/Tamu/Agent) dan izinnya' })
  positions() {
    return this.org.positions();
  }

  @Put('positions/:id/permissions')
  @Permissions(PERMISSIONS.POSITION.UPDATE)
  setPermissions(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SetPositionPermissionsDto) {
    return this.org.setPositionPermissions(u, id, dto.permissions);
  }

  @Get('permissions')
  @Permissions(PERMISSIONS.PERMISSION.VIEW)
  permissions() {
    return this.org.permissions();
  }
}
