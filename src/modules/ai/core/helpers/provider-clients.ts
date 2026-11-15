import { AiProviderId } from '@common/constants/domain.constant';

export interface ProviderCredentials {
  provider: AiProviderId;
  apiKey?: string;
  baseUrl?: string;
}

export interface ProviderInfo {
  name: string;
  /** URL dasar API default. */
  baseUrl?: string;
  needsKey: boolean;
  needsBaseUrl?: boolean;
}

export const PROVIDER_INFO: Record<AiProviderId, ProviderInfo> = {
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', needsKey: true },
  google: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', needsKey: true },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', needsKey: true },
  qwen: { name: 'Alibaba Qwen', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', needsKey: true },
  moonshot: { name: 'Moonshot Kimi', baseUrl: 'https://api.moonshot.ai/v1', needsKey: true },
  mistral: { name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', needsKey: true },
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', needsKey: true },
  xai: { name: 'xAI Grok', baseUrl: 'https://api.x.ai/v1', needsKey: true },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', needsKey: true },
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', needsKey: true },
  compatible: { name: 'Server sendiri (kompatibel OpenAI)', needsKey: false, needsBaseUrl: true },
};

export interface ProviderErrorInfo {
  status: number;
  /** Judul pendek bahasa Indonesia, mis. "Saldo penyedia habis". */
  title: string;
  /** Langkah yang bisa dilakukan pengguna. */
  hint?: string;
  /** Pesan asli dari penyedia (sudah dirapikan). */
  detail: string;
}

export class ProviderError extends Error {
  constructor(message: string, readonly info?: ProviderErrorInfo) {
    super(message);
  }
}

/** Ambil pesan inti dari badan galat penyedia (JSON gaya OpenAI/Anthropic/Google) dan klasifikasikan. */
export function parseProviderError(status: number, raw: string): ProviderErrorInfo {
  let msg = raw;
  try {
    const j = JSON.parse(raw);
    const e = Array.isArray(j) ? j[0]?.error : j.error;
    msg = (typeof e === 'string' ? e : e?.message) ?? j.message ?? raw;
  } catch { /* bukan JSON: pakai apa adanya */ }
  const detail = String(msg).replace(/\s+/g, ' ').trim().slice(0, 240);
  const low = detail.toLowerCase();
  if (/credit balance|insufficient|quota|billing|balance|exceeded your current/.test(low) || status === 402) {
    return { status, detail, title: 'Saldo atau kuota penyedia habis', hint: 'Isi saldo di dashboard penyedia, atau pindahkan agent ini ke penyedia lain di halaman Agent.' };
  }
  if (status === 404 || /no longer available|not found|does not exist|deprecated|unknown model/.test(low)) {
    return { status, detail, title: 'Model tidak tersedia untuk akunmu', hint: 'Ganti model agent ini di halaman Agent, lalu coba lagi.' };
  }
  if (status === 401 || status === 403) return { status, detail, title: 'API key ditolak', hint: 'Periksa atau ganti API key di Pengaturan → Penyedia AI.' };
  if (status === 429) return { status, detail, title: 'Terlalu banyak permintaan', hint: 'Tunggu sebentar lalu coba lagi. Kalau terus berulang, kuota penyedia mungkin habis.' };
  if (status >= 500) return { status, detail, title: 'Penyedia sedang bermasalah', hint: 'Biasanya sementara. Coba lagi beberapa menit lagi.' };
  return { status, detail, title: 'Permintaan ditolak penyedia', hint: status === 400 ? 'Periksa pengaturan model agent ini.' : undefined };
}

/** Versi teks satu baris (untuk log dan pengujian koneksi). */
export function explainProviderError(status: number, raw: string): string {
  const i = parseProviderError(status, raw);
  return `Penyedia membalas ${status}: ${i.detail}${i.hint ? ` → ${i.hint}` : ''}`;
}

/** Pesan galat untuk dibaca pengguna di percakapan (mendukung **tebal**, `kode`, dan daftar). */
export function failureMarkdown(opts: { agentName: string; providerName?: string; model?: string; error: unknown }): string {
  const e = opts.error;
  const who = [opts.providerName, opts.model].filter(Boolean).join(' · ');
  if (e instanceof ProviderError && e.info) {
    const i = e.info;
    return [
      `⚠️ **${opts.agentName} belum bisa mengerjakan ini**`,
      `**${i.title}.**${who ? ` (${who})` : ''}`,
      ...(i.hint ? ['', `**Yang bisa dilakukan**`, `- ${i.hint}`] : []),
      '',
      `**Detail teknis**`,
      `- Kode: \`${i.status}\``,
      `- Pesan penyedia: ${i.detail}`,
    ].join('\n');
  }
  const detail = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').trim().slice(0, 240);
  return [`⚠️ **${opts.agentName} belum bisa mengerjakan ini**`, '', `**Detail teknis**`, `- ${detail}`].join('\n');
}

const TIMEOUT = 15_000;

async function getJson(url: string, headers: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    throw new ProviderError(`Tidak bisa menghubungi ${new URL(url).host}: ${(e as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) throw new ProviderError('API key ditolak penyedia (tidak valid atau tidak punya akses)');
  if (!res.ok) throw new ProviderError(`Penyedia membalas ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

/**
 * Uji kredensial dengan mengambil daftar model dari API penyedia.
 * Mengembalikan id model yang bisa dipakai untuk chat/generate.
 */
export async function listModels(c: ProviderCredentials): Promise<string[]> {
  const base = (c.baseUrl || PROVIDER_INFO[c.provider].baseUrl || '').replace(/\/$/, '');
  const bearer: Record<string, string> = c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {};
  switch (c.provider) {
    case 'anthropic': {
      const j = await getJson(`${base}/models?limit=100`, { 'x-api-key': c.apiKey!, 'anthropic-version': '2023-06-01' });
      return (j.data ?? []).map((m: { id: string }) => m.id);
    }
    case 'google': {
      const j = await getJson(`${base}/models?pageSize=200`, { 'x-goog-api-key': c.apiKey! });
      return (j.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string }) => m.name.replace(/^models\//, ''));
    }
    case 'openrouter': {
      // Validasi key dulu (daftar model OpenRouter bersifat publik).
      await getJson(`${base}/key`, bearer);
      const j = await getJson(`${base}/models`, bearer);
      return (j.data ?? []).map((m: { id: string }) => m.id);
    }
    default: {
      // OpenAI dan semua penyedia berformat sama (DeepSeek, Qwen, Kimi, Mistral, Groq, xAI, server sendiri).
      const j = await getJson(`${base}/models`, bearer);
      return (j.data ?? []).map((m: { id: string }) => m.id);
    }
  }
}

export interface ChatResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeout = 120_000) {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  } catch (e) {
    throw new ProviderError(`Tidak bisa menghubungi ${new URL(url).host}: ${(e as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) throw new ProviderError('API key ditolak penyedia');
  if (!res.ok) {
    const raw = await res.text();
    throw new ProviderError(explainProviderError(res.status, raw), parseProviderError(res.status, raw));
  }
  return res.json() as Promise<any>;
}

/** Satu permintaan teks ke model (dipakai agent menulis caption, naskah, ringkasan). */
export async function chat(c: ProviderCredentials, model: string, system: string, prompt: string, maxTokens = 1500): Promise<ChatResult> {
  const base = (c.baseUrl || PROVIDER_INFO[c.provider].baseUrl || '').replace(/\/$/, '');
  switch (c.provider) {
    case 'anthropic': {
      const j = await postJson(`${base}/messages`, { 'x-api-key': c.apiKey!, 'anthropic-version': '2023-06-01' }, {
        model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }],
      });
      return {
        text: (j.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim(),
        tokensIn: j.usage?.input_tokens ?? 0,
        tokensOut: j.usage?.output_tokens ?? 0,
      };
    }
    case 'google': {
      const j = await postJson(`${base}/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': c.apiKey! }, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      });
      return {
        text: (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim(),
        tokensIn: j.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: j.usageMetadata?.candidatesTokenCount ?? 0,
      };
    }
    default: {
      // OpenAI, xAI, OpenRouter, dan server kompatibel OpenAI memakai format chat/completions.
      const limit = c.provider === 'openai' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
      const j = await postJson(`${base}/chat/completions`, c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}, {
        model, ...limit, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      });
      return {
        text: String(j.choices?.[0]?.message?.content ?? '').trim(),
        tokensIn: j.usage?.prompt_tokens ?? 0,
        tokensOut: j.usage?.completion_tokens ?? 0,
      };
    }
  }
}

// ---------- Agent: pemanggilan dengan alat (tool use) ----------

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; sig?: string }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolTurn {
  content: ContentBlock[];
  stopReason: string;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Satu giliran model Anthropic dengan alat. Pemanggil yang menjalankan alat lalu mengirim hasilnya kembali. */
export async function chatWithTools(
  c: ProviderCredentials,
  model: string,
  system: string,
  messages: AgentMessage[],
  tools: ToolSpec[],
  maxTokens = 3000,
): Promise<ToolTurn> {
  if (c.provider === 'google') return chatWithToolsGoogle(c, model, system, messages, tools, maxTokens);
  if (c.provider !== 'anthropic') return chatWithToolsOpenAI(c, model, system, messages, tools, maxTokens);
  const base = (c.baseUrl || PROVIDER_INFO.anthropic.baseUrl || '').replace(/\/$/, '');
  let lastErr: unknown;
  // Ulangi sebentar untuk kelebihan beban (429/529) dan galat jaringan.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = await postJson(
        `${base}/messages`,
        { 'x-api-key': c.apiKey!, 'anthropic-version': '2023-06-01' },
        {
          model,
          max_tokens: maxTokens,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          tools: tools.map((t, i) => (i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t)),
          messages,
        },
        180_000,
      );
      return {
        content: (j.content ?? []).filter((b: { type: string }) => b.type === 'text' || b.type === 'tool_use'),
        stopReason: j.stop_reason ?? 'end_turn',
        tokensIn: j.usage?.input_tokens ?? 0,
        tokensOut: j.usage?.output_tokens ?? 0,
        cacheRead: j.usage?.cache_read_input_tokens ?? 0,
        cacheWrite: j.usage?.cache_creation_input_tokens ?? 0,
      };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : '';
      if (!/ 429| 529| 5\d\d|Tidak bisa menghubungi/.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Penyedia berformat OpenAI: terjemahkan pesan & alat gaya Anthropic ke chat/completions dan kembali. */
/** Skema JSON → subset OpenAPI yang diterima Gemini (buang kata kunci yang tidak didukung). */
function geminiSchema(n: unknown): unknown {
  if (Array.isArray(n)) return n.map(geminiSchema);
  if (!n || typeof n !== 'object') return n;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
    if (['additionalProperties', '$schema', 'default', 'examples', 'title'].includes(k)) continue;
    out[k] = geminiSchema(v);
  }
  return out;
}

/** Gemini: function calling (Anthropic-format ↔ Gemini). Tidak untuk model Gemma (tanpa function calling). */
async function chatWithToolsGoogle(c: ProviderCredentials, model: string, system: string, messages: AgentMessage[], tools: ToolSpec[], maxTokens: number): Promise<ToolTurn> {
  const base = (c.baseUrl || PROVIDER_INFO.google.baseUrl || '').replace(/\/$/, '');
  const names = new Map<string, string>();
  const contents: Record<string, unknown>[] = [];
  for (const m of messages) {
    if (typeof m.content === 'string') { contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }); continue; }
    if (m.role === 'assistant') {
      const parts: Record<string, unknown>[] = [];
      for (const b of m.content) {
        if (b.type === 'text' && b.text) parts.push({ text: b.text });
        else if (b.type === 'tool_use') { names.set(b.id, b.name); parts.push({ functionCall: { name: b.name, args: b.input ?? {} }, ...(b.sig ? { thoughtSignature: b.sig } : {}) }); }
      }
      if (parts.length) contents.push({ role: 'model', parts });
    } else {
      const parts: Record<string, unknown>[] = [];
      for (const b of m.content) {
        if (b.type === 'tool_result') parts.push({ functionResponse: { name: names.get(b.tool_use_id) ?? 'tool', response: b.is_error ? { error: b.content } : { result: b.content } } });
        else if (b.type === 'text') parts.push({ text: b.text });
      }
      if (parts.length) contents.push({ role: 'user', parts });
    }
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = await postJson(`${base}/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': c.apiKey! }, {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.input_schema) })) }],
        generationConfig: { maxOutputTokens: maxTokens },
      }, 180_000);
      const cand = j.candidates?.[0];
      const content: ContentBlock[] = [];
      let n = 0;
      for (const p of cand?.content?.parts ?? []) {
        if (p.thought) continue;
        if (p.functionCall) content.push({ type: 'tool_use', id: `g${Date.now().toString(36)}${n++}`, name: String(p.functionCall.name), input: p.functionCall.args ?? {}, ...(p.thoughtSignature ? { sig: String(p.thoughtSignature) } : {}) });
        else if (typeof p.text === 'string' && p.text) content.push({ type: 'text', text: p.text });
      }
      const used = content.some((b) => b.type === 'tool_use');
      return {
        content,
        stopReason: used ? 'tool_use' : cand?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
        tokensIn: j.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: (j.usageMetadata?.candidatesTokenCount ?? 0) + (j.usageMetadata?.thoughtsTokenCount ?? 0),
        cacheRead: 0,
        cacheWrite: 0,
      };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : '';
      if (!/ 429| 5\d\d|Tidak bisa menghubungi/.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function chatWithToolsOpenAI(c: ProviderCredentials, model: string, system: string, messages: AgentMessage[], tools: ToolSpec[], maxTokens: number): Promise<ToolTurn> {
  const base = (c.baseUrl || PROVIDER_INFO[c.provider].baseUrl || '').replace(/\/$/, '');
  const out: Record<string, unknown>[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content });
    } else if (m.role === 'assistant') {
      const text = m.content.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n');
      const calls = m.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
        .map((b) => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
      out.push({ role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const b of m.content) {
        if (b.type === 'tool_result') out.push({ role: 'tool', tool_call_id: b.tool_use_id, content: b.content });
        else if (b.type === 'text') out.push({ role: 'user', content: b.text });
      }
    }
  }
  const limit = c.provider === 'openai' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = await postJson(`${base}/chat/completions`, c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}, {
        model, ...limit, messages: out,
        tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
      }, 180_000);
      const choice = j.choices?.[0];
      const msg = choice?.message ?? {};
      const content: ContentBlock[] = [];
      if (msg.content) content.push({ type: 'text', text: String(msg.content) });
      for (const tc of msg.tool_calls ?? []) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(tc.function?.arguments || '{}'); } catch { /* argumen rusak: biarkan kosong, alat akan menolaknya */ }
        content.push({ type: 'tool_use', id: String(tc.id), name: String(tc.function?.name), input });
      }
      const cached = j.usage?.prompt_cache_hit_tokens ?? j.usage?.prompt_tokens_details?.cached_tokens ?? 0;
      return {
        content,
        stopReason: msg.tool_calls?.length ? 'tool_use' : choice?.finish_reason === 'length' ? 'max_tokens' : 'end_turn',
        // prompt_tokens sudah termasuk bagian yang di-cache; pisahkan agar biaya tidak terhitung dua kali.
        tokensIn: Math.max(0, (j.usage?.prompt_tokens ?? 0) - cached),
        tokensOut: j.usage?.completion_tokens ?? 0,
        cacheRead: cached,
        cacheWrite: 0,
      };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : '';
      if (!/ 429| 5\d\d|Tidak bisa menghubungi/.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}
