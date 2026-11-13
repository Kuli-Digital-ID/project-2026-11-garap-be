import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { Audience, LiveEvent, RealtimeBus } from './realtime.bus';

const HEARTBEAT_MS = 20_000;
/** Koneksi ditutup berkala; browser menyambung lagi otomatis dan sesi diperiksa ulang. */
const MAX_LIFETIME_MS = 60 * 60 * 1000;
const MAX_STREAMS_PER_USER = 5;

@ApiTags('Realtime')
@Controller({ path: 'events', version: '1' })
export class RealtimeController {
  private readonly streams = new Map<number, Set<Response>>();
  /** Username akun yang sedang tersambung (untuk status online). */
  private readonly names = new Map<number, string>();
  private readonly offlineTimers = new Map<number, ReturnType<typeof setTimeout>>();

  private onlineNames() {
    return [...this.names.values()];
  }

  constructor(
    private bus: RealtimeBus,
    private prisma: PrismaService,
  ) {}

  /** Apakah akun ini boleh menerima kejadian dengan pembatas `to`? */
  private async allowed(user: JwtPayload, to?: Audience): Promise<boolean> {
    if (!to) return user.positionName !== 'Tamu';
    if (to.except === user.userId) return false;
    if (to.users) return to.users.includes(user.userId);
    if (to.permission && user.positionName !== 'Owner' && !user.permissions.includes(to.permission)) return false;
    if (user.positionName !== 'Tamu') return true;
    // Tamu hanya menerima kejadian proyek tempat ia menjadi anggota.
    if (to.project) {
      return !!(await this.prisma.projectMember.findFirst({ where: { user_id: user.userId, project: { slug: to.project } }, select: { id: true } }));
    }
    if (to.ticketKey) {
      return !!(await this.prisma.projectMember.findFirst({
        where: { user_id: user.userId, project: { tickets: { some: { key: to.ticketKey } } } },
        select: { id: true },
      }));
    }
    return false;
  }

  @Get()
  @ApiOperation({
    summary: 'Aliran kejadian realtime (Server-Sent Events)',
    description:
      'Koneksi HTTP yang tetap terbuka (EventSource, cookie login). Kejadian: `ready` {online:[username]}, `presence` {username,online}, `change` {res,key?,project?,by}, `notification`, `chat`. ' +
      'Isi kejadian hanya petunjuk; klien mengambil data terbaru lewat endpoint biasa.',
  })
  stream(@GetUser() user: JwtPayload, @Req() req: Request, @Res() res: Response) {
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    // Tamu tidak diberi daftar siapa yang online.
    const online = user.positionName === 'Tamu' ? [] : this.onlineNames();
    res.write(`retry: 4000\nevent: ready\ndata: ${JSON.stringify({ online })}\n\n`);

    // Batasi jumlah tab per akun; yang paling lama ditutup.
    const mine = this.streams.get(user.userId) ?? new Set<Response>();
    while (mine.size >= MAX_STREAMS_PER_USER) {
      const oldest = mine.values().next().value as Response;
      mine.delete(oldest);
      oldest.end();
    }
    mine.add(res);
    this.streams.set(user.userId, mine);
    // Mulai tersambung → online (pemutusan singkat saat sambung ulang tidak dianggap offline).
    clearTimeout(this.offlineTimers.get(user.userId));
    this.offlineTimers.delete(user.userId);
    if (!this.names.has(user.userId)) {
      this.names.set(user.userId, user.username);
      this.bus.publish({ type: 'presence', data: { username: user.username, online: true } });
    }

    // Kejadian diproses berurutan agar urutan kiriman tetap sama dengan urutan terbit.
    let queue = Promise.resolve();
    const sub = this.bus.events$.subscribe((ev: LiveEvent) => {
      queue = queue
        .then(async () => {
          if (res.writableEnded || !(await this.allowed(user, ev.to))) return;
          res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
        })
        .catch(() => undefined);
    });
    const ping = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    const expire = setTimeout(() => res.end(), MAX_LIFETIME_MS);

    const cleanup = () => {
      clearInterval(ping);
      clearTimeout(expire);
      sub.unsubscribe();
      mine.delete(res);
      if (!mine.size) {
        this.streams.delete(user.userId);
        this.offlineTimers.set(
          user.userId,
          setTimeout(() => {
            if (this.streams.has(user.userId)) return;
            this.names.delete(user.userId);
            this.offlineTimers.delete(user.userId);
            this.bus.publish({ type: 'presence', data: { username: user.username, online: false } });
          }, 8000),
        );
      }
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  }
}
