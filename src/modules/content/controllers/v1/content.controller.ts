import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { ContentService } from '../../content.service';
import { SocialService } from '../../social.service';
import {
  AgentDraftDto, AgentWriteDto, CalendarQueryDto, ConnectQueryDto, ContentFormatDto, CreatePostDto, ManualChannelDto, MarkPublishedDto, MetricsDto,
  ScheduleDto, UpdateChannelDto, UpdatePostDto, UpdateScheduleDto,
} from '../../core/dto/content.dto';

const T = PERMISSIONS.TICKET;

@ApiTags('Social accounts')
@Controller({ path: 'social', version: '1' })
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('platforms')
  @Permissions(PERMISSIONS.SOCIAL.VIEW)
  @ApiOperation({ summary: 'Platform yang didukung & apakah aplikasi developer-nya sudah diatur di .env' })
  platforms() {
    return this.social.platforms();
  }

  @Get('channels')
  @Permissions(PERMISSIONS.SOCIAL.VIEW)
  @ApiOperation({ summary: 'Akun sosmed workspace (token tidak pernah dikirim)' })
  list(@Query('project') project?: string) {
    return this.social.list(project);
  }

  @Get('connect/:platform')
  @Permissions(PERMISSIONS.SOCIAL.MANAGE)
  @ApiOperation({ summary: 'Mulai login platform (redirect). Buka dari browser: /api/v1/social/connect/instagram?projects=konten-sosmed' })
  connect(@GetUser() u: JwtPayload, @Param('platform') platform: string, @Query() q: ConnectQueryDto, @Res() res: Response) {
    const { url } = this.social.startOAuth(u, platform, (q.projects ?? '').split(',').filter(Boolean), q.redirect);
    return res.redirect(url);
  }

  @Public()
  @Get('oauth/callback/:platform')
  @ApiOperation({ summary: 'Callback OAuth platform (daftarkan URL ini di aplikasi developer tiap platform)' })
  async callback(@Param('platform') platform: string, @Query('code') code: string, @Query('state') state: string, @Query('error') error: string, @Res() res: Response) {
    return res.redirect(await this.social.finishOAuth(platform, code, state, error));
  }

  @Post('channels')
  @Permissions(PERMISSIONS.SOCIAL.MANAGE)
  @ApiOperation({ summary: 'Tambah akun mode manual (tanpa login platform)' })
  createManual(@GetUser() u: JwtPayload, @Body() dto: ManualChannelDto) {
    return this.social.createManual(u, dto);
  }

  @Patch('channels/:id')
  @Permissions(PERMISSIONS.SOCIAL.MANAGE)
  update(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChannelDto) {
    return this.social.update(u, id, dto);
  }

  @Delete('channels/:id')
  @Permissions(PERMISSIONS.SOCIAL.MANAGE)
  remove(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.social.remove(u, id);
  }
}

@ApiTags('Content')
@Controller({ version: '1' })
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // Kalender & laporan
  @Get('projects/:slug/calendar')
  @Permissions(PERMISSIONS.PROJECT.VIEW)
  @ApiOperation({ summary: 'Tiket konten (dan tenggat tiket lain) dalam rentang tanggal' })
  calendar(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Query() q: CalendarQueryDto) {
    return this.content.calendar(u, slug, q.from, q.to);
  }

  @Get('projects/:slug/content-report')
  @Permissions(PERMISSIONS.PROJECT.VIEW)
  @ApiOperation({ summary: 'Performa postingan tayang (default 30 hari)' })
  report(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Query('days') days?: string) {
    return this.content.report(u, slug, Math.min(365, Math.max(1, Number(days) || 30)));
  }

  // Konten rutin
  @Get('projects/:slug/content-schedules')
  @Permissions(PERMISSIONS.PROJECT.VIEW)
  schedules(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.content.schedules(u, slug);
  }

  @Post('projects/:slug/content-schedules')
  @Permissions(T.ADD)
  @ApiOperation({ summary: 'Buat konten rutin (mis. Reels tiap Selasa & Jumat 19.00, tiket dibuat H-3)' })
  createSchedule(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: ScheduleDto) {
    return this.content.createSchedule(u, slug, dto);
  }

  @Post('projects/:slug/content-schedules/run')
  @Permissions(T.ADD)
  @ApiOperation({ summary: 'Buat tiket konten rutin sekarang (biasanya otomatis tiap 10 menit)' })
  run(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.content.runNow(u, slug);
  }

  @Patch('content-schedules/:id')
  @Permissions(T.UPDATE)
  updateSchedule(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto) {
    return this.content.updateSchedule(u, id, dto);
  }

  @Delete('content-schedules/:id')
  @Permissions(T.DELETE)
  removeSchedule(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.removeSchedule(u, id);
  }

  // Publikasi di tiket
  @Put('tickets/:key/content')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Jadikan tiket konten (format) atau null untuk melepas' })
  setFormat(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: ContentFormatDto) {
    return this.content.setFormat(u, key, dto.format ?? null);
  }

  @Post('tickets/:key/posts')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Tambah akun tujuan publikasi ke tiket' })
  addPost(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: CreatePostDto) {
    return this.content.addPost(u, key, dto);
  }

  @Post('tickets/:key/agent-write')
  @Permissions(T.COMMENT)
  @ApiOperation({ summary: 'Agent menulis naskah/ide/hashtag/ringkasan sebagai komentar (memakai model AI agent)' })
  agentWrite(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: AgentWriteDto) {
    return this.content.agentWrite(u, key, dto.agent, dto.task, dto.instructions);
  }

  @Patch('content-posts/:id')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Ubah judul/caption/jadwal (membatalkan persetujuan)' })
  updatePost(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.content.updatePost(u, id, dto);
  }

  @Delete('content-posts/:id')
  @Permissions(T.UPDATE)
  removePost(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.removePost(u, id);
  }

  @Post('content-posts/:id/agent-draft')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Agent menulis caption (dan judul YouTube) memakai model AI-nya' })
  agentDraft(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: AgentDraftDto) {
    return this.content.agentDraft(u, id, dto.agent, dto.instructions);
  }

  @Post('content-posts/:id/submit')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Ajukan untuk disetujui (agent → muncul di halaman Persetujuan)' })
  submit(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.submit(u, id);
  }

  @Post('content-posts/:id/approve')
  @Permissions(T.VIEW)
  @ApiOperation({ summary: 'Setujui & jadwalkan (lead proyek / Admin / PUBLISH_CONTENT)' })
  approve(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.approve(u, id);
  }

  @Post('content-posts/:id/unschedule')
  @Permissions(T.UPDATE)
  unschedule(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.unschedule(u, id);
  }

  @Post('content-posts/:id/publish-now')
  @Permissions(T.VIEW)
  @ApiOperation({ summary: 'Tayangkan sekarang lewat API platform (akun otomatis)' })
  publishNow(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.publishNow(u, id);
  }

  @Post('content-posts/:id/mark-published')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Tandai sudah diposting manual + link postingan' })
  markPublished(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MarkPublishedDto) {
    return this.content.markPublished(u, id, dto.url);
  }

  @Put('content-posts/:id/metrics')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Isi statistik manual (akun tanpa API)' })
  setMetrics(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MetricsDto) {
    return this.content.setMetrics(u, id, dto);
  }

  @Post('content-posts/:id/refresh-metrics')
  @Permissions(T.VIEW)
  refreshMetrics(@GetUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.content.refreshMetrics(u, id);
  }
}
