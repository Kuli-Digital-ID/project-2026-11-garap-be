import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '../../audit.service';
import { NotificationsService } from '../../notifications.service';
import { ApprovalsService } from '../../approvals.service';
import { ApprovalQueryDto, AuditQueryDto, CreateApprovalDto, DecideApprovalDto, MarkReadDto, NotificationPrefsDto, NotificationQueryDto, RunQueryDto } from '../../core/dto/activity.dto';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Notifikasi milik akun yang masuk' })
  list(@GetUser() user: JwtPayload, @Query() q: NotificationQueryDto) {
    return this.service.list(user.userId, q.unread, q.limit);
  }

  @Post('read')
  @ApiOperation({ summary: 'Tandai notifikasi sudah dibaca (kosongkan ids untuk semua)' })
  read(@GetUser() user: JwtPayload, @Body() dto: MarkReadDto) {
    return this.service.markRead(user.userId, dto.ids);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Preferensi notifikasi (di aplikasi & email) akun yang masuk' })
  preferences(@GetUser() user: JwtPayload) {
    return this.service.getPreferences(user.userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Simpan preferensi notifikasi' })
  setPreferences(@GetUser() user: JwtPayload, @Body() dto: NotificationPrefsDto) {
    return this.service.setPreferences(user.userId, dto);
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Kirim email uji ke alamat akun sendiri' })
  testEmail(@GetUser() user: JwtPayload) {
    return this.service.sendTestEmail(user.userId);
  }
}

@ApiTags('Approvals')
@Controller({ path: 'approvals', version: '1' })
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get()
  @Permissions(PERMISSIONS.APPROVAL.VIEW)
  @ApiOperation({ summary: 'Daftar persetujuan tindakan agent' })
  list(@GetUser() user: JwtPayload, @Query() q: ApprovalQueryDto) {
    return this.service.list(user, q);
  }

  @Post()
  @ApiOperation({ summary: 'Agent mengajukan persetujuan' })
  create(@GetUser() user: JwtPayload, @Body() dto: CreateApprovalDto) {
    return this.service.create(user, dto);
  }

  @Post(':id/decide')
  @Permissions(PERMISSIONS.APPROVAL.DECIDE)
  @ApiOperation({ summary: 'Setujui atau tolak' })
  decide(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideApprovalDto) {
    return this.service.decide(user, id, dto);
  }
}

@ApiTags('Agents')
@Controller({ path: 'runs', version: '1' })
export class RunsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get()
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Riwayat run agent' })
  list(@GetUser() user: JwtPayload, @Query() q: RunQueryDto) {
    return this.service.runs(user, q);
  }

  @Get(':code')
  @Permissions(PERMISSIONS.AGENT.VIEW)
  @ApiOperation({ summary: 'Detail run (langkah-langkah agent)' })
  get(@Param('code') code: string) {
    return this.service.run(code);
  }
}

@ApiTags('Audit')
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT.VIEW)
  @ApiOperation({ summary: 'Log audit workspace' })
  list(@Query() q: AuditQueryDto) {
    return this.service.list(q);
  }

  @Get('export')
  @Permissions(PERMISSIONS.AUDIT.VIEW)
  @ApiOperation({ summary: 'Unduh log audit sebagai CSV (maks 10.000 baris, ikut filter)' })
  async export(@Query() q: AuditQueryDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.service.exportCsv(q);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from(csv, 'utf8'));
  }
}
