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
  xai: { name: 'xAI Grok', baseUrl: 'https://api.x.ai/v1', needsKey: true },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', needsKey: true },
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', needsKey: true },
  compatible: { name: 'Server sendiri (kompatibel OpenAI)', needsKey: false, needsBaseUrl: true },
};

export class ProviderError extends Error {}

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
    case 'xai':
    case 'openai':
    case 'compatible': {
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
  if (!res.ok) throw new ProviderError(`Penyedia membalas ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
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
  if (c.provider !== 'anthropic') throw new ProviderError('Alat agent saat ini hanya tersedia untuk Anthropic');
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
