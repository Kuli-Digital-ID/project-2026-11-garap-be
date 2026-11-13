import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RealtimeBus } from './realtime.bus';

/**
 * Setiap permintaan tulis yang berhasil (POST/PATCH/PUT/DELETE) diumumkan ke semua klien yang terhubung
 * sebagai kejadian "change", sehingga papan, dokumen, permintaan, dst. langsung segar di layar orang lain.
 * Isi kejadian hanya petunjuk (jenis + kunci); klien mengambil data terbarunya sendiri lewat API biasa
 * sehingga izin akses tetap dicek seperti biasa.
 */
@Injectable()
export class RealtimeInterceptor implements NestInterceptor {
  constructor(private bus: RealtimeBus) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next.handle();
    return next.handle().pipe(
      tap((result) => {
        try {
          this.announce(req, result);
        } catch {
          // Pengumuman gagal tidak boleh menggagalkan permintaan yang sudah berhasil.
        }
      }),
    );
  }

  private announce(req: any, result: any) {
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    const m = path.match(/^\/[^/]+\/v\d+\/(.+?)\/?$/);
    if (!m) return;
    const seg = m[1].split('/').map((s) => decodeURIComponent(s));
    const by = req.user?.username as string | undefined;
    const except = req.user?.userId as number | undefined;
    const emit = (data: Record<string, unknown>, to: { project?: string; ticketKey?: string; permission?: string } = {}) =>
      this.bus.publish({ type: 'change', data: { ...data, by }, to: { ...to, except } });

    const [head, id, sub] = seg;
    switch (head) {
      case 'tickets': {
        // /tickets/bulk… tanpa kunci → klien memuat ulang daftar tiket.
        const key = id && id !== 'bulk' ? id.toUpperCase() : undefined;
        emit({ res: 'ticket', key }, key ? { ticketKey: key } : {});
        return;
      }
      case 'projects': {
        if (!id) return emit({ res: 'project' });
        if (sub === 'tickets' && req.method === 'POST') {
          const key = result?.key ?? result?.ticket?.key;
          return emit({ res: 'ticket', key, project: id }, { project: id });
        }
        return emit({ res: 'project', project: id }, { project: id });
      }
      case 'docs':
        return emit({ res: 'doc', key: id });
      case 'requests':
        return emit({ res: 'request' });
      case 'approvals':
        return emit({ res: 'approval' }, { permission: 'VIEW_APPROVAL' });
      case 'runs':
        return emit({ res: 'run' }, { permission: 'VIEW_AGENT' });
      case 'members':
      case 'divisions':
      case 'positions':
      case 'agents':
        return emit({ res: 'org' });
      default:
        return;
    }
  }
}
