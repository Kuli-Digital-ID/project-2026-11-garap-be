import { AgentRuntime } from '../agent-runtime.service';

type Resp = { content: unknown[]; stop_reason: string; usage?: Record<string, number> };

const tool = (name: string, input: Record<string, unknown>, id = `tu_${name}`) => ({ type: 'tool_use', id, name, input });
const text = (t: string) => ({ type: 'text', text: t });

/** Menjalankan satu tugas agent penuh dengan API Anthropic palsu (lewat fetch) dan DB palsu. */
function setup(responses: Resp[], doc = { status: 'Draf', project: 'dolan', sections: [{ heading: 'Latar belakang', body: '' }, { heading: 'Tujuan', body: '' }, { heading: 'Ruang lingkup', body: '' }] }, opts: { role?: string } = {}) {
  const bodies: Record<string, any>[] = [];
  const queue = [...responses];
  const fetchMock = jest.fn(async (_url: string, init: { body: string }) => {
    bodies.push(JSON.parse(init.body));
    const r = queue.shift();
    if (!r) throw new Error('respons palsu habis');
    return { ok: true, status: 200, json: async () => ({ ...r, usage: r.usage ?? { input_tokens: 100, output_tokens: 50 } }), text: async () => '' };
  });
  (global as any).fetch = fetchMock;

  const agent = {
    id: 7, username: 'tyas', email: 'tyas@x.id', display_name: 'Tyas', role: opts.role ?? 'Business Analyst', position_id: 3, kind: 'agent',
    position: { name: 'Agent', position_permissions: [] },
    agent_profile: { provider: 'anthropic', model_id: 'claude-opus-5-5', model: 'claude-opus-5-5', budget: 0, supervisor_id: 1, description: '', persona: '', skills: [], learnings: [] },
  };
  const ticket = { key: 'DOL-1', project: 'dolan', title: 'Susun BRD', description: 'Aplikasi wisata', attachments: [] };
  const fn = (v?: unknown) => jest.fn(async () => v);
  const prisma: any = {
    user: { findFirst: fn(agent), findUnique: fn({ display_name: 'Bhagas', username: 'bhagas' }), update: fn() },
    agentUsage: { aggregate: fn({ _sum: { cost: 0 } }), create: fn(), findMany: fn([]) },
    agentProfile: { update: fn(), findUnique: fn({ learnings: [] }) },
    agentJob: { update: fn(), updateMany: fn() },
    agentRun: { create: fn({ id: 99 }), update: fn() },
    project: { findFirst: fn({ id: 1 }) },
    ticket: { findFirst: fn({ id: 5 }) },
    workspace: { findFirst: fn({ name: 'Kuli Digital' }) },
    projectMember: { findFirst: fn({ id: 1 }) },
  };
  const docs = { get: fn(doc), update: fn({}), review: fn({}), list: fn([]) };
  const tickets = { get: fn(ticket), addComment: fn({}) };
  const bus = { publish: jest.fn() };
  const notifications = { notify: fn() };
  const ai = { credentials: fn({ provider: 'anthropic', apiKey: 'k', baseUrl: 'https://api.anthropic.test/v1' }) };
  const rt = new (AgentRuntime as any)(prisma, ai, tickets, docs, {}, {}, notifications, {}, bus, {}) as AgentRuntime;
  const job = { id: 1, agent_id: 7, kind: 'assign', ticket_key: 'DOL-1', conversation_id: null, project_slug: 'dolan', prompt: '', actor_id: 1, attempts: 1 };
  const run = () => (rt as any).process(job) as Promise<void>;
  const lastCall = (m: jest.Mock) => m.mock.calls[m.mock.calls.length - 1][0] as any;
  return { run, prisma, docs, tickets, bodies, notifications, lastCall };
}

describe('AgentRuntime — tugas dokumen', () => {
  it('mengisi BRD kosong, mengajukan review, dan melaporkan hasilnya', async () => {
    const s = setup([
      { content: [tool('get_doc', { slug: 'dolan-brd-dolan-v01' })], stop_reason: 'tool_use' },
      { content: [tool('update_doc', { slug: 'dolan-brd-dolan-v01', sections: [{ heading: 'tujuan', body: 'Memudahkan pesan tiket wisata' }, { heading: 'Latar belakang', body: 'Klien butuh pemesanan online' }] })], stop_reason: 'tool_use' },
      { content: [tool('submit_doc_review', { slug: 'dolan-brd-dolan-v01' })], stop_reason: 'tool_use' },
      { content: [text('BRD Dolan sudah saya isi dan diajukan review.')], stop_reason: 'end_turn' },
    ]);
    await s.run();
    const [, , patch] = s.docs.update.mock.calls[0] as unknown as [unknown, string, { sections: { heading: string; body: string }[] }];
    expect(patch.sections.map((x) => x.heading)).toEqual(['Latar belakang', 'Tujuan', 'Ruang lingkup']);
    expect(patch.sections[0].body).toBe('Klien butuh pemesanan online');
    expect(patch.sections[1].body).toBe('Memudahkan pesan tiket wisata');
    expect(s.docs.review).toHaveBeenCalledWith(expect.anything(), 'dolan-brd-dolan-v01', { status: 'Direview' });
    expect(s.tickets.addComment).toHaveBeenCalledWith(expect.anything(), 'DOL-1', { text: 'BRD Dolan sudah saya isi dan diajukan review.' });
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('berhasil');
    expect(s.prisma.agentJob.update.mock.calls[0][0].data.status).toBe('done');
  });

  it('mengulang dengan batas token lebih besar bila habis sebelum menjawab (bukan "Selesai" kosong)', async () => {
    const s = setup([
      { content: [], stop_reason: 'max_tokens', usage: { input_tokens: 100, output_tokens: 16000 } },
      { content: [text('Sudah beres.')], stop_reason: 'end_turn' },
    ]);
    await s.run();
    expect(s.bodies[0].max_tokens).toBe(16000);
    expect(s.bodies[1].max_tokens).toBe(32000);
    expect(s.tickets.addComment).toHaveBeenCalledWith(expect.anything(), 'DOL-1', { text: 'Sudah beres.' });
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('berhasil');
  });

  it('gagal jelas (bukan berhasil) bila batas token tetap habis', async () => {
    const s = setup([
      { content: [], stop_reason: 'max_tokens' },
      { content: [], stop_reason: 'max_tokens' },
    ]);
    await s.run();
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('gagal');
    expect(s.prisma.agentJob.update.mock.calls[0][0].data.status).toBe('failed');
  });

  it('tanpa teks akhir tetapi sudah menulis: ringkasan dibuat dari langkahnya', async () => {
    const s = setup([
      { content: [tool('update_doc', { slug: 'x', sections: [{ heading: 'Tujuan', body: 'isi' }] })], stop_reason: 'tool_use' },
      { content: [], stop_reason: 'end_turn' },
    ]);
    await s.run();
    const call = s.tickets.addComment.mock.calls[0] as unknown as [unknown, string, { text: string }];
    expect(call[2].text).toMatch(/^Beres\. Mengisi dokumen x/);
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('berhasil');
  });

  it('tanpa teks dan tanpa perubahan apa pun = gagal, bukan "Selesai"', async () => {
    const s = setup([{ content: [], stop_reason: 'end_turn' }]);
    await s.run();
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('gagal');
    expect(s.prisma.agentJob.update.mock.calls[0][0].data.status).toBe('failed');
    expect(s.notifications.notify).toHaveBeenCalled();
  });

  it('dokumen yang sudah disetujui tidak ditimpa', async () => {
    const s = setup([
      { content: [tool('update_doc', { slug: 'x', sections: [{ heading: 'Tujuan', body: 'isi' }] })], stop_reason: 'tool_use' },
      { content: [text('Dokumennya terkunci, saya tidak mengubahnya.')], stop_reason: 'end_turn' },
    ], { status: 'Disetujui', project: 'dolan', sections: [] });
    await s.run();
    expect(s.docs.update).not.toHaveBeenCalled();
  });

  it('pesan pertama ditandai cache agar giliran berikutnya murah', async () => {
    const s = setup([{ content: [text('ok')], stop_reason: 'end_turn' }]);
    await s.run();
    const first = s.bodies[0].messages[0];
    expect(Array.isArray(first.content)).toBe(true);
    expect(first.content[0].cache_control).toEqual({ type: 'ephemeral' });
  });
});

describe('AgentRuntime — skill', () => {
  it('agent dev melihat daftar skill dan tool load_skill; agent non-dev tidak', async () => {
    const dev = setup([{ content: [text('ok')], stop_reason: 'end_turn' }], undefined, { role: 'Backend Developer' });
    await dev.run();
    expect(dev.bodies[0].tools.map((t: { name: string }) => t.name)).toEqual(expect.arrayContaining(['load_skill', 'read_skill_reference']));
    expect(dev.bodies[0].system[0].text).toContain('nestjs-expert');

    const mk = setup([{ content: [text('ok')], stop_reason: 'end_turn' }], undefined, { role: 'Marketing Writer' });
    await mk.run();
    expect(mk.bodies[0].tools.map((t: { name: string }) => t.name)).not.toContain('load_skill');
    expect(mk.bodies[0].system[0].text).not.toContain('load_skill');

    const ba = setup([{ content: [text('ok')], stop_reason: 'end_turn' }]);
    await ba.run();
    expect(ba.bodies[0].tools.map((t: { name: string }) => t.name)).toContain('load_skill');
    expect(ba.bodies[0].system[0].text).toContain('brd-writer');
    expect(ba.bodies[0].system[0].text).not.toContain('nestjs-expert');
  });

  it('load_skill mengembalikan panduan dan hasilnya dikirim kembali ke model', async () => {
    const s = setup([
      { content: [tool('load_skill', { name: 'nestjs-expert' })], stop_reason: 'tool_use' },
      { content: [tool('read_skill_reference', { name: 'nestjs-expert', file: 'authentication.md' })], stop_reason: 'tool_use' },
      { content: [text('Rancangan modul auth sudah saya tulis.')], stop_reason: 'end_turn' },
    ], undefined, { role: 'Backend Developer' });
    await s.run();
    const results = s.bodies[2].messages.filter((m: any) => m.role === 'user' && Array.isArray(m.content)).flatMap((m: any) => m.content).filter((b: any) => b.type === 'tool_result');
    expect(results[0].content).toContain('# Skill: nestjs-expert');
    expect(results[0].is_error).toBeUndefined();
    expect(results[1].content.length).toBeGreaterThan(100);
    expect(s.prisma.agentRun.update.mock.calls[0][0].data.status).toBe('berhasil');
  });

  it('skill di luar jatah posisi ditolak sebagai galat alat, bukan membocorkan isinya', async () => {
    const s = setup([
      { content: [tool('load_skill', { name: 'swift-expert' })], stop_reason: 'tool_use' },
      { content: [text('Baik, saya tidak memakainya.')], stop_reason: 'end_turn' },
    ], undefined, { role: 'Backend Developer' });
    await s.run();
    const r = s.bodies[1].messages.filter((m: any) => Array.isArray(m.content)).flatMap((m: any) => m.content).find((b: any) => b.type === 'tool_result');
    expect(r.is_error).toBe(true);
    expect(r.content).toMatch(/tidak tersedia/);
  });
});

