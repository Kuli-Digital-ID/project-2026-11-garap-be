import { DueReminderService } from '../due-reminder.service';

const day = 86_400_000;
const ticket = (n: number, dueOffsetDays: number, assignee = 7) => ({
  key: `PNR-${n}`, title: `Tiket ${n}`, assignee_id: assignee, project: { slug: 'pinarak' },
  due_date: new Date(Date.UTC(2026, 10, 15) + dueOffsetDays * day),
});

const setup = (tickets: any[], opts: { tz?: string; seen?: any[]; mailEnabled?: boolean } = {}) => {
  const prisma: any = {
    workspace: { findFirst: jest.fn().mockResolvedValue({ timezone: opts.tz ?? 'Asia/Jakarta' }) },
    ticket: { findMany: jest.fn().mockResolvedValue(tickets) },
    notification: { findMany: jest.fn().mockResolvedValue(opts.seen ?? []) },
    user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@x.id', display_name: 'A', notif_prefs: null }) },
  };
  const notifications: any = { notify: jest.fn().mockResolvedValue(undefined) };
  const mail: any = { enabled: opts.mailEnabled ?? true, sendNotification: jest.fn().mockResolvedValue(undefined) };
  return { svc: new DueReminderService(prisma, notifications, mail), prisma, notifications, mail };
};

// 15 Nov 2026 03:00 UTC = 10.00 WIB (jam wajar); 20:00 UTC = 03.00 WIB (tengah malam).
const NOON = new Date('2026-11-15T03:00:00Z');
const NIGHT = new Date('2026-11-15T20:00:00Z');

describe('DueReminderService', () => {
  it('tidak mengirim apa pun di luar jam 07.00–20.00 waktu workspace', async () => {
    const { svc, notifications, prisma } = setup([ticket(1, 0)]);
    expect(await svc.run(NIGHT)).toEqual({ sent: 0 });
    expect(notifications.notify).not.toHaveBeenCalled();
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });
  it('mengingatkan hari ini, besok, dan terlambat dengan kunci anti-ganda yang stabil', async () => {
    const { svc, notifications } = setup([ticket(1, 0), ticket(2, 1), ticket(3, -2)]);
    expect(await svc.run(NOON)).toEqual({ sent: 3 });
    const keys = notifications.notify.mock.calls.map((c: any[]) => c[0].dedupeKey).sort();
    expect(keys).toEqual(['due:PNR-1:2026-11-15:soon', 'due:PNR-2:2026-11-16:soon', 'due:PNR-3:2026-11-13:late']);
    const texts = notifications.notify.mock.calls.map((c: any[]) => c[0].text).join('|');
    expect(texts).toContain('jatuh tempo hari ini');
    expect(texts).toContain('jatuh tempo besok');
    expect(texts).toContain('terlambat 2 hari');
  });
  it('melewati tiket yang sudah pernah diingatkan', async () => {
    const { svc, notifications } = setup([ticket(1, 0)], { seen: [{ recipient_id: 7, dedupe_key: 'due:PNR-1:2026-11-15:soon' }] });
    expect(await svc.run(NOON)).toEqual({ sent: 0 });
    expect(notifications.notify).not.toHaveBeenCalled();
  });
  it('lebih dari 3 tiket per orang → satu email ringkasan, bukan email satuan', async () => {
    const { svc, notifications, mail } = setup([1, 2, 3, 4, 5].map((n) => ticket(n, 0)));
    await svc.run(NOON);
    expect(notifications.notify.mock.calls.every((c: any[]) => c[0].skipEmail === true)).toBe(true);
    expect(mail.sendNotification).toHaveBeenCalledTimes(1);
    expect(mail.sendNotification.mock.calls[0][1].text).toContain('5 tiketmu perlu perhatian');
  });
  it('3 tiket atau kurang → email satuan (lewat notify), tanpa ringkasan', async () => {
    const { svc, notifications, mail } = setup([1, 2, 3].map((n) => ticket(n, 0)));
    await svc.run(NOON);
    expect(notifications.notify.mock.calls.every((c: any[]) => c[0].skipEmail === false)).toBe(true);
    expect(mail.sendNotification).not.toHaveBeenCalled();
  });
  it('database gagal tidak melempar error', async () => {
    const { svc, prisma } = setup([]);
    prisma.ticket.findMany.mockRejectedValue(new Error('db mati'));
    await expect(svc.run(NOON)).resolves.toEqual({ sent: 0 });
  });
});
