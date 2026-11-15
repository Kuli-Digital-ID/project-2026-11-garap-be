import { chatWithTools, explainProviderError, PROVIDER_INFO } from '../core/helpers/provider-clients';

describe('explainProviderError', () => {
  it('model tidak tersedia (Gemini 404) → petunjuk ganti model', () => {
    const raw = JSON.stringify({ error: { code: 404, message: 'This model models/gemini-2.5-pro is no longer available to new users.' } });
    const t = explainProviderError(404, raw);
    expect(t).toContain('no longer available');
    expect(t).toContain('Ganti model agent');
    expect(t).not.toContain('{');
  });
  it('saldo habis (Anthropic 400) → petunjuk isi saldo', () => {
    const raw = JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } });
    expect(explainProviderError(400, raw)).toContain('Isi saldo');
  });
  it('badan bukan JSON tetap aman', () => {
    expect(explainProviderError(500, 'upstream error')).toContain('Penyedia membalas 500: upstream error');
  });
});

describe('penyedia berformat OpenAI', () => {
  it('terdaftar dengan alamat dasar', () => {
    for (const id of ['deepseek', 'qwen', 'moonshot', 'mistral', 'groq'] as const) expect(PROVIDER_INFO[id].baseUrl).toMatch(/^https:\/\//);
  });

  it('menerjemahkan alat & hasil alat ke format OpenAI dan kembali', async () => {
    const calls: any[] = [];
    const realFetch = global.fetch;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({
        choices: [{ finish_reason: 'tool_calls', message: { content: 'Saya cek dulu.', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_ticket', arguments: '{"key":"A-1"}' } }] } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, prompt_cache_hit_tokens: 40 },
      }), { status: 200 });
    }) as any;
    try {
      const turn = await chatWithTools(
        { provider: 'deepseek', apiKey: 'k' }, 'deepseek-chat', 'SISTEM',
        [
          { role: 'user', content: 'halo' },
          { role: 'assistant', content: [{ type: 'text', text: 'oke' }, { type: 'tool_use', id: 'call_0', name: 'list', input: { a: 1 } }] },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_0', content: 'hasil' }] },
        ],
        [{ name: 'get_ticket', description: 'ambil tiket', input_schema: { type: 'object', properties: { key: { type: 'string' } } } }],
      );
      const body = calls[0];
      expect(body.messages[0]).toEqual({ role: 'system', content: 'SISTEM' });
      expect(body.messages[2].tool_calls[0]).toMatchObject({ id: 'call_0', type: 'function', function: { name: 'list', arguments: '{"a":1}' } });
      expect(body.messages[3]).toEqual({ role: 'tool', tool_call_id: 'call_0', content: 'hasil' });
      expect(body.tools[0].function.name).toBe('get_ticket');
      expect(turn.stopReason).toBe('tool_use');
      expect(turn.content).toEqual([{ type: 'text', text: 'Saya cek dulu.' }, { type: 'tool_use', id: 'call_1', name: 'get_ticket', input: { key: 'A-1' } }]);
      expect(turn.tokensIn).toBe(60); // 100 - 40 yang di-cache
      expect(turn.cacheRead).toBe(40);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('menerjemahkan alat & hasil alat ke format Gemini dan kembali', async () => {
    const calls: any[] = [];
    const realFetch = global.fetch;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ functionCall: { name: 'get_planning', args: { project: 'IDER' } }, thoughtSignature: 'sig1' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;
    try {
      const tools = [{ name: 'get_planning', description: 'd', input_schema: { type: 'object', additionalProperties: false, properties: { project: { type: 'string' } }, required: ['project'] } }];
      const msgs: any[] = [
        { role: 'user', content: 'halo' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 'x1', name: 'get_planning', input: { project: 'IDER' }, sig: 'old' }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x1', content: 'ok' }] },
      ];
      const r = await chatWithTools({ provider: 'google', apiKey: 'k' }, 'gemini-2.5-flash', 's', msgs, tools);
      expect(r.stopReason).toBe('tool_use');
      expect(r.content[0]).toMatchObject({ type: 'tool_use', name: 'get_planning', input: { project: 'IDER' }, sig: 'sig1' });
      const body = calls[0];
      expect(JSON.stringify(body.tools)).not.toContain('additionalProperties');
      expect(body.contents[1].parts[0]).toMatchObject({ functionCall: { name: 'get_planning' }, thoughtSignature: 'old' });
      expect(body.contents[2].parts[0].functionResponse).toMatchObject({ name: 'get_planning', response: { result: 'ok' } });
    } finally { global.fetch = realFetch; }
  });
});

import { failureMarkdown, ProviderError, parseProviderError } from '../core/helpers/provider-clients';

describe('failureMarkdown', () => {
  it('format terstruktur: judul, langkah, detail teknis', () => {
    const raw = JSON.stringify({ error: { code: 404, message: 'This model models/gemini-2.5-pro is no longer available to new users.' } });
    const err = new ProviderError('x', parseProviderError(404, raw));
    const t = failureMarkdown({ agentName: 'Mimi', providerName: 'Google Gemini', model: 'gemini-2.5-pro', error: err });
    expect(t).toContain('**Mimi belum bisa mengerjakan ini**');
    expect(t).toContain('**Model tidak tersedia untuk akunmu.** (Google Gemini · gemini-2.5-pro)');
    expect(t).toContain('**Yang bisa dilakukan**\n- Ganti model agent');
    expect(t).toContain('- Kode: `404`');
    expect(t).not.toMatch(/\{\s*"error"/);
  });
  it('saldo habis dikenali dari pesan Anthropic', () => {
    const raw = JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } });
    expect(parseProviderError(400, raw).title).toBe('Saldo atau kuota penyedia habis');
  });
  it('galat biasa tetap rapi', () => {
    expect(failureMarkdown({ agentName: 'Sena', error: new Error('boom') })).toContain('- boom');
  });
});
