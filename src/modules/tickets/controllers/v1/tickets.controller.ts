import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadedDiskFile } from '@modules/files/files.service';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { TicketsService } from '../../tickets.service';
import {
  AttachmentDto, BulkKeysDto, BulkUpdateDto, ChecklistDto, CommentDto, CreateTicketDto, LinkDto, MoveTicketDto, TicketQueryDto, UpdateTicketDto,
} from '../../core/dto/ticket.dto';

const T = PERMISSIONS.TICKET;

@ApiTags('Tickets')
@Controller({ version: '1' })
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('projects/:slug/tickets')
  @Permissions(T.VIEW)
  @ApiOperation({ summary: 'Tiket proyek: papan (sprint=active), backlog (sprint=backlog), atau semua' })
  listByProject(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Query() q: TicketQueryDto) {
    return this.tickets.list(u, q, slug);
  }

  @Post('projects/:slug/tickets')
  @Permissions(T.ADD)
  create(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: CreateTicketDto) {
    return this.tickets.create(u, slug, dto);
  }

  @Get('tickets')
  @Permissions(T.VIEW)
  @ApiOperation({ summary: 'Cari tiket lintas proyek, mis. ?assignee=me untuk "Tugas saya"' })
  list(@GetUser() u: JwtPayload, @Query() q: TicketQueryDto) {
    return this.tickets.list(u, q);
  }

  @Post('tickets/bulk')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Ubah banyak tiket sekaligus' })
  bulkUpdate(@GetUser() u: JwtPayload, @Body() dto: BulkUpdateDto) {
    return this.tickets.bulkUpdate(u, dto);
  }

  @Post('tickets/bulk-delete')
  @Permissions(T.DELETE)
  bulkDelete(@GetUser() u: JwtPayload, @Body() dto: BulkKeysDto) {
    return this.tickets.bulkRemove(u, dto.keys);
  }

  @Get('tickets/:key')
  @Permissions(T.VIEW)
  @ApiOperation({ summary: 'Detail tiket (komentar, lampiran, relasi, sub-tugas)' })
  get(@GetUser() u: JwtPayload, @Param('key') key: string) {
    return this.tickets.get(u, key);
  }

  @Patch('tickets/:key')
  @Permissions(T.UPDATE)
  update(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.update(u, key, dto);
  }

  @Post('tickets/:key/move')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Geser kartu di papan (status + urutan)' })
  move(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: MoveTicketDto) {
    return this.tickets.move(u, key, dto);
  }

  @Delete('tickets/:key')
  @Permissions(T.DELETE)
  remove(@GetUser() u: JwtPayload, @Param('key') key: string) {
    return this.tickets.remove(u, key);
  }

  @Post('tickets/:key/comments')
  @Permissions(T.COMMENT)
  @ApiOperation({ summary: 'Tambah komentar (@username memberi notifikasi)' })
  addComment(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: CommentDto) {
    return this.tickets.addComment(u, key, dto);
  }

  @Patch('tickets/:key/comments/:id')
  @Permissions(T.COMMENT)
  updateComment(@GetUser() u: JwtPayload, @Param('key') key: string, @Param('id', ParseIntPipe) id: number, @Body() dto: CommentDto) {
    return this.tickets.updateComment(u, key, id, dto);
  }

  @Delete('tickets/:key/comments/:id')
  @Permissions(T.COMMENT)
  removeComment(@GetUser() u: JwtPayload, @Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.removeComment(u, key, id);
  }

  @Put('tickets/:key/checklist')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Simpan seluruh checklist' })
  checklist(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: ChecklistDto) {
    return this.tickets.setChecklist(u, key, dto.items);
  }

  @Post('tickets/:key/links')
  @Permissions(T.UPDATE)
  addLink(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: LinkDto) {
    return this.tickets.addLink(u, key, dto);
  }

  @Post('tickets/:key/links/remove')
  @Permissions(T.UPDATE)
  removeLink(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: LinkDto) {
    return this.tickets.removeLink(u, key, dto);
  }

  @Post('tickets/:key/attachments')
  @Permissions(T.UPDATE)
  @ApiOperation({ summary: 'Lampirkan tautan luar (Drive, Figma, ...): metadata + URL' })
  addAttachment(@GetUser() u: JwtPayload, @Param('key') key: string, @Body() dto: AttachmentDto) {
    return this.tickets.addAttachment(u, key, dto);
  }

  @Post('tickets/:key/attachments/upload')
  @Permissions(T.UPDATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Unggah file lampiran (multipart, field "file"; batas UPLOAD_MAX_MB)' })
  uploadAttachment(@GetUser() u: JwtPayload, @Param('key') key: string, @UploadedFile() file: UploadedDiskFile) {
    return this.tickets.uploadAttachment(u, key, file);
  }

  @Delete('tickets/:key/attachments/:id')
  @Permissions(T.UPDATE)
  removeAttachment(@GetUser() u: JwtPayload, @Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.removeAttachment(u, key, id);
  }

  @Post('tickets/:key/watch')
  @Permissions(T.VIEW)
  watch(@GetUser() u: JwtPayload, @Param('key') key: string) {
    return this.tickets.watch(u, key, true);
  }

  @Delete('tickets/:key/watch')
  @Permissions(T.VIEW)
  unwatch(@GetUser() u: JwtPayload, @Param('key') key: string) {
    return this.tickets.watch(u, key, false);
  }
}
