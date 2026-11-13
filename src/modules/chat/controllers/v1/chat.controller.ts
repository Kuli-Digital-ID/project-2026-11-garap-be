import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { ChatService } from '../../chat.service';
import { AddMembersDto, CreateChannelDto, DirectDto, EditMessageDto, MessagesQueryDto, ReadDto, SendMessageDto, UpdateChannelDto } from '../../core/dto/chat.dto';

@ApiTags('Percakapan')
@Controller({ path: 'conversations', version: '1' })
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Kanal & pesan langsung saya (+ kanal publik), dengan jumlah belum dibaca' })
  list(@GetUser() user: JwtPayload) {
    return this.service.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Buat kanal' })
  create(@GetUser() user: JwtPayload, @Body() dto: CreateChannelDto) {
    return this.service.create(user, dto);
  }

  @Post('dm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buka pesan langsung dengan seorang anggota (dibuat bila belum ada)' })
  direct(@GetUser() user: JwtPayload, @Body() dto: DirectDto) {
    return this.service.direct(user, dto.username);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Ubah nama / topik / privasi kanal' })
  update(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChannelDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus kanal beserta pesannya' })
  remove(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }

  @Post(':id/join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Masuk ke kanal publik' })
  join(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.join(user, id);
  }

  @Post(':id/members')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tambah anggota kanal' })
  addMembers(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: AddMembersDto) {
    return this.service.addMembers(user, id, dto);
  }

  @Delete(':id/members/:username')
  @ApiOperation({ summary: 'Keluar dari kanal, atau mengeluarkan anggota' })
  removeMember(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('username') username: string) {
    return this.service.removeMember(user, id, username);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Pesan dalam kanal (terlama → terbaru); gunakan before untuk halaman sebelumnya' })
  messages(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Query() q: MessagesQueryDto) {
    return this.service.messages(user, id, q);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Kirim pesan (ke kanal publik otomatis bergabung)' })
  send(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.service.send(user, id, dto);
  }

  @Patch(':id/messages/:mid')
  @ApiOperation({ summary: 'Ubah pesan sendiri' })
  edit(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('mid', ParseIntPipe) mid: number, @Body() dto: EditMessageDto) {
    return this.service.edit(user, id, mid, dto.text);
  }

  @Delete(':id/messages/:mid')
  @ApiOperation({ summary: 'Hapus pesan (pengirim, Admin, Owner)' })
  removeMessage(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('mid', ParseIntPipe) mid: number) {
    return this.service.removeMessage(user, id, mid);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tandai kanal sudah dibaca' })
  read(@GetUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ReadDto) {
    return this.service.markRead(user, id, dto.upTo);
  }
}
