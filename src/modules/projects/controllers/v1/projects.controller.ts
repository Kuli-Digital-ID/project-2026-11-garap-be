import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { ProjectsService } from '../../projects.service';
import {
  CompleteSprintDto, CreateProjectDto, EpicDto, MembersDto, ProjectQueryDto, SprintInputDto, UpdateEpicDto, UpdateProjectDto, UpdateSprintDto, WorkflowDto,
} from '../../core/dto/project.dto';

const P = PERMISSIONS.PROJECT;

@ApiTags('Projects')
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @Permissions(P.VIEW)
  @ApiOperation({ summary: 'Daftar proyek (filter status/divisi/milik saya/cari)' })
  list(@GetUser() u: JwtPayload, @Query() q: ProjectQueryDto) {
    return this.projects.list(u, q);
  }

  @Post()
  @Permissions(P.ADD)
  @ApiOperation({ summary: 'Buat proyek dari template (software/kanban/kreatif/konten)' })
  create(@GetUser() u: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projects.create(u, dto);
  }

  @Get(':slug')
  @Permissions(P.VIEW)
  get(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.projects.get(u, slug);
  }

  @Patch(':slug')
  @Permissions(P.UPDATE)
  update(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(u, slug, dto);
  }

  @Delete(':slug')
  @Permissions(P.DELETE)
  remove(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.projects.remove(u, slug);
  }

  @Put(':slug/members')
  @Permissions(P.MANAGE_MEMBER)
  @ApiOperation({ summary: 'Ganti daftar anggota proyek' })
  setMembers(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: MembersDto) {
    return this.projects.setMembers(u, slug, dto);
  }

  @Put(':slug/workflow')
  @Permissions(P.MANAGE_WORKFLOW)
  @ApiOperation({ summary: 'Simpan alur kerja (status, kategori, warna, WIP). Tiket di status yang dihapus dipindah.' })
  setWorkflow(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: WorkflowDto) {
    return this.projects.setWorkflow(u, slug, dto);
  }

  // Sprint
  @Get(':slug/sprints')
  @Permissions(P.VIEW)
  sprints(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.projects.sprints(u, slug);
  }

  @Post(':slug/sprints')
  @Permissions(P.MANAGE_SPRINT)
  createSprint(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: SprintInputDto) {
    return this.projects.createSprint(u, slug, dto);
  }

  @Patch(':slug/sprints/:id')
  @Permissions(P.MANAGE_SPRINT)
  updateSprint(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSprintDto) {
    return this.projects.updateSprint(u, slug, id, dto);
  }

  @Post(':slug/sprints/:id/complete')
  @Permissions(P.MANAGE_SPRINT)
  @ApiOperation({ summary: 'Selesaikan sprint; tiket belum selesai ke backlog atau sprint berikutnya' })
  completeSprint(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Param('id', ParseIntPipe) id: number, @Body() dto: CompleteSprintDto) {
    return this.projects.completeSprint(u, slug, id, dto);
  }

  // Epic
  @Get(':slug/epics')
  @Permissions(P.VIEW)
  epics(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.projects.epics(u, slug);
  }

  @Post(':slug/epics')
  @Permissions(P.UPDATE)
  createEpic(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: EpicDto) {
    return this.projects.createEpic(u, slug, dto);
  }

  @Patch(':slug/epics/:id')
  @Permissions(P.UPDATE)
  updateEpic(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEpicDto) {
    return this.projects.updateEpic(u, slug, id, dto);
  }

  @Delete(':slug/epics/:id')
  @Permissions(P.UPDATE)
  removeEpic(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Param('id', ParseIntPipe) id: number) {
    return this.projects.removeEpic(u, slug, id);
  }
}
