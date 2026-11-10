import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { isManager } from '@common/helpers/access';
import { requestInclude, toRequest } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { NotificationsService } from '@modules/activity/notifications.service';
import { TicketsService } from '@modules/tickets/tickets.service';
import { AcceptRequestDto, CreateRequestDto, RejectRequestDto, RequestQueryDto, UpdateRequestDto } from './core/dto/request.dto';

const day = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const kindOf = (name: string) => (/\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? 'gambar' : /\.pdf$/i.test(name) ? 'pdf' : 'dokumen');

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private tickets: TicketsService,
    private notifications: NotificationsService,
  ) {}

  private async myDivisionId(user: JwtPayload) {
    const me = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { division_id: true } });
    return me?.division_id ?? null;
  }

  private async find(code: string) {
    const r = await this.prisma.workRequest.findUnique({ where: { code: code.toUpperCase() }, include: { division: true } });
    if (!r) throw new NotFoundException('Permintaan tidak ditemukan');
    return r;
  }

  /** Yang memproses: anggota divisi tujuan (atau Owner/Admin). */
  private async assertHandler(user: JwtPayload, divisionId: number) {
    if (isManager(user)) return;
    if ((await this.myDivisionId(user)) !== divisionId) throw new ForbiddenException('Hanya anggota divisi tujuan yang bisa memproses permintaan ini');
  }

  private async load(id: number) {
    return toRequest(await this.prisma.workRequest.findUniqueOrThrow({ where: { id }, include: requestInclude }));
  }

  async list(user: JwtPayload, q: RequestQueryDto) {
    const and: Prisma.WorkRequestWhereInput[] = [];
    if (q.division) and.push({ division: { slug: q.division } });
    if (q.status) and.push({ status: q.status });
    if (q.search) and.push({ OR: [{ title: { contains: q.search, mode: 'insensitive' } }, { code: { contains: q.search, mode: 'insensitive' } }] });
    if (q.box === 'keluar') and.push({ requester_id: user.userId });
    if (q.box === 'masuk') and.push({ division_id: (await this.myDivisionId(user)) ?? -1 });
    const rows = await this.prisma.workRequest.findMany({ where: { AND: and }, include: requestInclude, orderBy: { created_at: 'desc' } });
    return rows.map(toRequest);
  }

  async get(code: string) {
    return this.load((await this.find(code)).id);
  }

  async create(user: JwtPayload, dto: CreateRequestDto) {
    const division = await this.prisma.division.findFirst({ where: { slug: dto.division, deleted_at: null } });
    if (!division) throw new BadRequestException(`Divisi "${dto.division}" tidak ditemukan`);
    if (division.request_kinds.length && !division.request_kinds.includes(dto.kind)) {
      throw new BadRequestException(`Jenis "${dto.kind}" tidak diterima divisi ${division.name}. Pilihan: ${division.request_kinds.join(', ')}`);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workRequest.create({
        data: {
          code: randomUUID(),
          title: dto.title,
          detail: dto.detail,
          division_id: division.id,
          kind: dto.kind,
          requester_id: user.userId,
          priority: dto.priority ?? 'sedang',
          due_date: dto.due ? day(dto.due) : undefined,
          references: dto.references ?? [],
          attachments: {
            create: (dto.attachments ?? []).map((a) => ({ name: a.name, size: a.size, kind: a.kind ?? kindOf(a.name), url: a.url, uploader_id: user.userId })),
          },
        },
      });
      return tx.workRequest.update({ where: { id: created.id }, data: { code: `REQ-${created.id}` } });
    });
    await this.notifications.notify({
      recipientIds: [division.lead_id], actorId: user.userId, kind: 'assign', text: `mengirim permintaan ke ${division.name}`, target: dto.title, href: '/permintaan',
    });
    return this.load(row.id);
  }

  async update(user: JwtPayload, code: string, dto: UpdateRequestDto) {
    const r = await this.find(code);
    if (r.requester_id !== user.userId && !isManager(user)) throw new ForbiddenException('Hanya pengaju yang bisa mengubah permintaan');
    if (!['baru', 'ditinjau'].includes(r.status)) throw new BadRequestException('Permintaan yang sudah diproses tidak bisa diubah');
    await this.prisma.workRequest.update({
      where: { id: r.id },
      data: { title: dto.title, detail: dto.detail, kind: dto.kind, priority: dto.priority, due_date: dto.due ? day(dto.due) : undefined, references: dto.references },
    });
    return this.load(r.id);
  }

  async review(user: JwtPayload, code: string) {
    const r = await this.find(code);
    await this.assertHandler(user, r.division_id);
    if (r.status !== 'baru') throw new BadRequestException('Hanya permintaan baru yang bisa ditandai ditinjau');
    await this.prisma.workRequest.update({ where: { id: r.id }, data: { status: 'ditinjau' } });
    await this.notifications.notify({ recipientIds: [r.requester_id], actorId: user.userId, kind: 'status', text: 'sedang meninjau permintaan Anda', target: r.title, href: '/permintaan' });
    return this.load(r.id);
  }

  /** Terima → tiket dibuat di proyek divisi tujuan dan ditautkan ke permintaan. */
  async accept(user: JwtPayload, code: string, dto: AcceptRequestDto) {
    const r = await this.find(code);
    await this.assertHandler(user, r.division_id);
    if (!['baru', 'ditinjau'].includes(r.status)) throw new BadRequestException('Permintaan ini sudah diproses');
    const refs = r.references.length ? `\n\n**Referensi**\n${r.references.map((x) => `- ${x}`).join('\n')}` : '';
    const requester = await this.prisma.user.findUniqueOrThrow({ where: { id: r.requester_id }, select: { username: true } });
    const ticket = await this.tickets.create(
      user,
      dto.project,
      {
        title: r.title,
        description: `${r.detail}\n\n_Permintaan ${r.code} dari @${requester.username} (${r.kind})._${refs}`,
        type: dto.type,
        status: dto.status,
        priority: r.priority,
        assigneeId: dto.assigneeId,
        due: r.due_date?.toISOString(),
        inSprint: dto.inSprint ?? true,
        labels: [r.kind],
      },
      { requestId: r.id },
    );
    await this.prisma.$transaction([
      this.prisma.workRequest.update({
        where: { id: r.id },
        data: { status: 'diterima', note: dto.note, project: { connect: { slug: dto.project } } },
      }),
      // Lampiran permintaan ikut terlihat di tiket.
      this.prisma.attachment.updateMany({ where: { request_id: r.id }, data: { ticket_id: ticket.id } }),
    ]);
    await this.notifications.notify({
      recipientIds: [r.requester_id], actorId: user.userId, kind: 'status', text: 'menerima permintaan Anda', target: `${ticket.key} ${r.title}`,
      href: `/proyek/${dto.project}/tiket/${ticket.key}`, project: dto.project,
    });
    return { request: await this.load(r.id), ticket };
  }

  async reject(user: JwtPayload, code: string, dto: RejectRequestDto) {
    const r = await this.find(code);
    await this.assertHandler(user, r.division_id);
    if (!['baru', 'ditinjau'].includes(r.status)) throw new BadRequestException('Permintaan ini sudah diproses');
    await this.prisma.workRequest.update({ where: { id: r.id }, data: { status: 'ditolak', note: dto.note } });
    await this.notifications.notify({ recipientIds: [r.requester_id], actorId: user.userId, kind: 'status', text: 'menolak permintaan Anda', target: r.title, href: '/permintaan' });
    return this.load(r.id);
  }
}
