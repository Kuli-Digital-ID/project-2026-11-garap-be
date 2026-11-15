import { csvCell } from '../audit.service';
import { DEFAULT_EMAIL, NotificationsService, wants } from '../notifications.service';

describe('wants (preferensi notifikasi)', () => {
  it('bawaan: in-app aktif semua, email hanya yang butuh tindakan', () => {
    expect(wants(null, 'inapp', 'comment')).toBe(true);
    expect(wants(undefined, 'email', 'mention')).toBe(true);
    expect(wants({}, 'email', 'assign')).toBe(true);
    expect(wants({}, 'email', 'due')).toBe(true);
    expect(wants({}, 'email', 'comment')).toBe(false);
    expect(wants({}, 'email', 'status')).toBe(false);
    expect(Object.keys(DEFAULT_EMAIL)).toContain('agent');
  });
  it('pilihan pengguna mengalahkan bawaan', () => {
    expect(wants({ email: { assign: false } }, 'email', 'assign')).toBe(false);
    expect(wants({ email: { comment: true } }, 'email', 'comment')).toBe(true);
    expect(wants({ inapp: { status: false } }, 'inapp', 'status')).toBe(false);
  });
  it('jenis tak dikenal: in-app aktif, email mati', () => {
    expect(wants({}, 'inapp', 'xyz')).toBe(true);
    expect(wants({}, 'email', 'xyz')).toBe(false);
  });
});

describe('csvCell (ekspor audit)', () => {
  it('menetralkan rumus agar tidak dieksekusi Excel', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('memberi kutip pada koma, kutip, dan baris baru', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('ia berkata "ya"')).toBe('"ia berkata ""ya"""');
    expect(csvCell('baris1\nbaris2')).toBe('"baris1\nbaris2"');
  });
  it('null/undefined jadi kosong, teks biasa apa adanya', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell('Mengubah izin')).toBe('Mengubah izin');
  });
});

describe('NotificationsService.notify', () => {
  const user = (id: number, extra: Record<string, unknown> = {}) => ({ id, kind: 'human', email: `u${id}@x.id`, display_name: `U${id}`, is_active: true, notif_prefs: null, ...extra });
  const make = (users: any[], seen: any[] = []) => {
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue(users), findUnique: jest.fn().mockResolvedValue({ display_name: 'Pelaku', kind: 'human' }) },
      notification: { findMany: jest.fn().mockResolvedValue(seen), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      agentJob: { createMany: jest.fn() },
    };
    const bus: any = { publish: jest.fn() };
    const mail: any = { enabled: true, sendNotification: jest.fn().mockResolvedValue(undefined) };
    return { svc: new NotificationsService(prisma, bus, mail), prisma, bus, mail };
  };
  const base = { kind: 'assign' as const, text: 'menugaskan tiket', href: '/x' };

  it('pelaku tidak menerima notifikasinya sendiri', async () => {
    const { svc, prisma } = make([]);
    await svc.notify({ ...base, recipientIds: [5], actorId: 5 });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it('mengirim email bila diaktifkan, dan menyebut nama pelaku', async () => {
    const { svc, mail } = make([user(2)]);
    await svc.notify({ ...base, recipientIds: [2], actorId: 1 });
    expect(mail.sendNotification).toHaveBeenCalledWith('u2@x.id', expect.objectContaining({ text: 'Pelaku menugaskan tiket' }));
  });
  it('tidak mengirim email bila dimatikan, tetapi notifikasi dalam aplikasi tetap dibuat', async () => {
    const { svc, mail, prisma } = make([user(2, { notif_prefs: { email: { assign: false } } })]);
    await svc.notify({ ...base, recipientIds: [2], actorId: 1 });
    expect(mail.sendNotification).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });
  it('tidak mengirim email ke akun .local, agent, atau yang nonaktif', async () => {
    const { svc, mail } = make([user(2, { email: 'a@kuli.local' }), user(3, { kind: 'agent' }), user(4, { is_active: false })]);
    await svc.notify({ ...base, recipientIds: [2, 3, 4], actorId: 1 });
    expect(mail.sendNotification).not.toHaveBeenCalled();
  });
  it('anti-ganda: penerima yang sudah punya dedupeKey dilewati', async () => {
    const { svc, prisma, mail } = make([user(2), user(3)], [{ recipient_id: 2 }]);
    await svc.notify({ ...base, kind: 'due', recipientIds: [2, 3], dedupeKey: 'due:A-1:2026-11-20:soon' });
    const rows = prisma.notification.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.recipient_id)).toEqual([3]);
    expect(mail.sendNotification).toHaveBeenCalledTimes(1);
  });
  it('skipEmail: tidak mengirim email (dipakai ringkasan pengingat)', async () => {
    const { svc, mail } = make([user(2)]);
    await svc.notify({ ...base, kind: 'due', recipientIds: [2], skipEmail: true });
    expect(mail.sendNotification).not.toHaveBeenCalled();
  });
});
