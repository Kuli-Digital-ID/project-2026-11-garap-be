import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { RequestsService } from '../../requests.service';
import { AcceptRequestDto, CreateRequestDto, RejectRequestDto, RequestQueryDto, UpdateRequestDto } from '../../core/dto/request.dto';

const R = PERMISSIONS.REQUEST;

@ApiTags('Requests')
@Controller({ path: 'requests', version: '1' })
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @Permissions(R.VIEW)
  @ApiOperation({ summary: 'Permintaan lintas divisi (box=masuk/keluar)' })
  list(@GetUser() u: JwtPayload, @Query() q: RequestQueryDto) {
    return this.requests.list(u, q);
  }

  @Get(':code')
  @Permissions(R.VIEW)
  get(@Param('code') code: string) {
    return this.requests.get(code);
  }

  @Post()
  @Permissions(R.ADD)
  @ApiOperation({ summary: 'Kirim permintaan ke divisi lain' })
  create(@GetUser() u: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.requests.create(u, dto);
  }

  @Patch(':code')
  @Permissions(R.ADD)
  update(@GetUser() u: JwtPayload, @Param('code') code: string, @Body() dto: UpdateRequestDto) {
    return this.requests.update(u, code, dto);
  }

  @Post(':code/review')
  @Permissions(R.PROCESS)
  review(@GetUser() u: JwtPayload, @Param('code') code: string) {
    return this.requests.review(u, code);
  }

  @Post(':code/accept')
  @Permissions(R.PROCESS, PERMISSIONS.TICKET.ADD)
  @ApiOperation({ summary: 'Terima permintaan → buat tiket di proyek divisi tujuan' })
  accept(@GetUser() u: JwtPayload, @Param('code') code: string, @Body() dto: AcceptRequestDto) {
    return this.requests.accept(u, code, dto);
  }

  @Post(':code/reject')
  @Permissions(R.PROCESS)
  reject(@GetUser() u: JwtPayload, @Param('code') code: string, @Body() dto: RejectRequestDto) {
    return this.requests.reject(u, code, dto);
  }
}
