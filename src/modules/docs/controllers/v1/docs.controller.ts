import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { DocsService } from '../../docs.service';
import { CreateDocDto, DocQueryDto, ReviewDocDto, UpdateDocDto } from '../../core/dto/doc.dto';

const D = PERMISSIONS.DOC;

@ApiTags('Docs')
@Controller({ path: 'docs', version: '1' })
export class DocsController {
  constructor(private readonly docs: DocsService) {}

  @Get()
  @Permissions(D.VIEW)
  @ApiOperation({ summary: 'Dokumen (BRD, SRS, arsitektur, notulen, ...) tanpa isi bagian' })
  list(@GetUser() u: JwtPayload, @Query() q: DocQueryDto) {
    return this.docs.list(u, q);
  }

  @Get(':slug')
  @Permissions(D.VIEW)
  get(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.docs.get(u, slug);
  }

  @Post()
  @Permissions(D.ADD)
  create(@GetUser() u: JwtPayload, @Body() dto: CreateDocDto) {
    return this.docs.create(u, dto);
  }

  @Patch(':slug')
  @Permissions(D.UPDATE)
  update(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: UpdateDocDto) {
    return this.docs.update(u, slug, dto);
  }

  @Post(':slug/review')
  @Permissions(D.REVIEW)
  @ApiOperation({ summary: 'Ubah status: Draf → Direview → Disetujui' })
  review(@GetUser() u: JwtPayload, @Param('slug') slug: string, @Body() dto: ReviewDocDto) {
    return this.docs.review(u, slug, dto);
  }

  @Delete(':slug')
  @Permissions(D.DELETE)
  remove(@GetUser() u: JwtPayload, @Param('slug') slug: string) {
    return this.docs.remove(u, slug);
  }
}
