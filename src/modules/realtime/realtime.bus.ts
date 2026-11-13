import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/** Siapa yang boleh menerima sebuah kejadian. Tanpa pembatas = semua anggota non-tamu yang sedang terhubung. */
export interface Audience {
  /** Hanya akun ini (id user). */
  users?: number[];
  /** Kejadian milik proyek ini: tamu hanya menerima bila anggota proyek. */
  project?: string;
  /** Kejadian milik tiket ini (kunci tiket): tamu hanya menerima bila anggota proyeknya. */
  ticketKey?: string;
  /** Izin yang harus dimiliki penerima (Owner selalu lolos). */
  permission?: string;
  /** Jangan kirim ke akun ini (pelaku). */
  except?: number;
}

export interface LiveEvent {
  /** Nama kejadian SSE: change | notification | chat */
  type: 'change' | 'notification' | 'chat' | 'presence';
  data: Record<string, unknown>;
  to?: Audience;
}

/**
 * Jalur kejadian di dalam proses. Cukup untuk satu instance BE; bila BE dijalankan lebih dari satu,
 * ganti isi `publish`/`events$` dengan Redis pub/sub — pemanggilnya tidak perlu berubah.
 */
@Injectable()
export class RealtimeBus {
  private readonly subject = new Subject<LiveEvent>();
  readonly events$: Observable<LiveEvent> = this.subject.asObservable();

  publish(event: LiveEvent) {
    this.subject.next(event);
  }
}
