import { Controller, Get, Param, ParseIntPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { FilesService } from '../../files.service';

@ApiTags('Tickets')
@Controller({ path: 'attachments', version: '1' })
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get(':id/file')
  @ApiOperation({ summary: 'Buka/unduh file lampiran yang diunggah (butuh sesi login)' })
  @ApiQuery({ name: 'download', required: false, description: '1 = selalu unduh, walau gambar/PDF' })
  async file(
    @GetUser() u: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.files.open(u, id);
    const disposition = f.inline && !download ? 'inline' : 'attachment';
    res.set({
      'Content-Type': f.mime,
      ...(f.size !== undefined ? { 'Content-Length': String(f.size) } : {}),
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(f.stream);
  }
}
