import { SocialPlatform } from '@common/constants/domain.constant';

/**
 * Adapter API tiap platform sosmed: OAuth, identitas akun, publikasi, dan statistik.
 * Ditulis mengikuti dokumentasi resmi masing-masing platform; setiap platform butuh aplikasi
 * developer sendiri (client id/secret di .env) dan sebagian butuh review/audit sebelum bisa
 * memposting publik.
 */

export class PlatformError extends Error {}

const META_V = process.env.META_GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${META_V}`;

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Nama parameter client id di URL authorize (TikTok memakai client_key). */
  clientIdParam?: string;
  scopeSeparator?: string;
  pkce?: boolean;
  /** Token endpoint memakai HTTP Basic (X). */
  basicAuth?: boolean;
  extraAuthParams?: Record<string, string>;
  /** Meta memakai GET untuk tukar token. */
  getToken?: boolean;
}

const meta = (scopes: string[]): OAuthConfig => ({
  authUrl: `https://www.facebook.com/${META_V}/dialog/oauth`,
  tokenUrl: `${GRAPH}/oauth/access_token`,
  scopes,
  clientIdEnv: 'META_APP_ID',
  clientSecretEnv: 'META_APP_SECRET',
  getToken: true,
});

export const OAUTH: Record<SocialPlatform, OAuthConfig> = {
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    extraAuthParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
  },
  instagram: meta(['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'business_management']),
  facebook: meta(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights']),
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    clientIdParam: 'client_key',
    scopeSeparator: ',',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'w_member_social'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },
  x: {
    authUrl: 'https://x.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    pkce: true,
    basicAuth: true,
  },
};

export const oauthReady = (p: SocialPlatform) => !!(process.env[OAUTH[p].clientIdEnv] && process.env[OAUTH[p].clientSecretEnv]);

// ---------- HTTP ----------

async function call(url: string, init: RequestInit & { json?: unknown; form?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(init.form).toString();
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, body, signal: init.signal ?? AbortSignal.timeout(60_000) });
  } catch (e) {
    throw new PlatformError(`Tidak bisa menghubungi ${new URL(url).host}: ${(e as Error).message}`);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error_description || data?.error?.code || data?.detail || data?.message || text.slice(0, 300);
    throw new PlatformError(`${new URL(url).host} membalas ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return { data, headers: res.headers };
}

// ---------- OAuth ----------

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  open_id?: string;
}

export function authorizeUrl(p: SocialPlatform, redirectUri: string, state: string, challenge?: string) {
  const c = OAUTH[p];
  const u = new URL(c.authUrl);
  u.search = new URLSearchParams({
    [c.clientIdParam ?? 'client_id']: process.env[c.clientIdEnv]!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: c.scopes.join(c.scopeSeparator ?? ' '),
    state,
    ...(c.pkce && challenge ? { code_challenge: challenge, code_challenge_method: 'S256' } : {}),
    ...(c.extraAuthParams ?? {}),
  }).toString();
  return u.toString();
}

export async function exchangeCode(p: SocialPlatform, code: string, redirectUri: string, verifier?: string): Promise<TokenSet> {
  const c = OAUTH[p];
  const id = process.env[c.clientIdEnv]!;
  const secret = process.env[c.clientSecretEnv]!;
  if (c.getToken) {
    const u = new URL(c.tokenUrl);
    u.search = new URLSearchParams({ client_id: id, client_secret: secret, redirect_uri: redirectUri, code }).toString();
    const short = (await call(u.toString())).data as TokenSet;
    // Tukar ke token jangka panjang (±60 hari); token Halaman turunannya tidak kedaluwarsa.
    const l = new URL(c.tokenUrl);
    l.search = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: id, client_secret: secret, fb_exchange_token: short.access_token }).toString();
    return (await call(l.toString())).data as TokenSet;
  }
  const form: Record<string, string> = { grant_type: 'authorization_code', code, redirect_uri: redirectUri };
  if (c.clientIdParam === 'client_key') form.client_key = id;
  else form.client_id = id;
  if (!c.basicAuth) form.client_secret = secret;
  if (c.pkce && verifier) form.code_verifier = verifier;
  const headers: Record<string, string> = c.basicAuth ? { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` } : {};
  return (await call(c.tokenUrl, { method: 'POST', form, headers })).data as TokenSet;
}

export async function refreshToken(p: SocialPlatform, refresh: string): Promise<TokenSet> {
  const c = OAUTH[p];
  if (c.getToken) throw new PlatformError('Token Meta tidak bisa diperbarui otomatis; hubungkan ulang akun');
  const id = process.env[c.clientIdEnv]!;
  const secret = process.env[c.clientSecretEnv]!;
  const form: Record<string, string> = { grant_type: 'refresh_token', refresh_token: refresh };
  if (c.clientIdParam === 'client_key') form.client_key = id;
  else form.client_id = id;
  if (!c.basicAuth) form.client_secret = secret;
  const headers: Record<string, string> = c.basicAuth ? { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` } : {};
  return (await call(c.tokenUrl, { method: 'POST', form, headers })).data as TokenSet;
}

export interface Identity {
  externalId: string;
  name: string;
  handle: string;
  /** Token khusus akun ini (mis. token Halaman Meta); kosong = pakai token user. */
  token?: string;
  meta?: Record<string, unknown>;
}

/** Akun yang bisa dipakai dari token ini. Meta bisa mengembalikan beberapa Halaman/akun IG. */
export async function identities(p: SocialPlatform, t: TokenSet): Promise<Identity[]> {
  const bearer = { Authorization: `Bearer ${t.access_token}` };
  switch (p) {
    case 'youtube': {
      const { data } = await call('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: bearer });
      return (data.items ?? []).map((c: any) => ({ externalId: c.id, name: c.snippet.title, handle: c.snippet.customUrl ?? c.snippet.title }));
    }
    case 'instagram':
    case 'facebook': {
      const { data } = await call(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(t.access_token)}`);
      const pages = data.data ?? [];
      if (p === 'facebook') return pages.map((pg: any) => ({ externalId: pg.id, name: pg.name, handle: pg.name, token: pg.access_token, meta: { page_id: pg.id } }));
      return pages
        .filter((pg: any) => pg.instagram_business_account)
        .map((pg: any) => ({
          externalId: pg.instagram_business_account.id,
          name: pg.name,
          handle: `@${pg.instagram_business_account.username}`,
          token: pg.access_token,
          meta: { page_id: pg.id },
        }));
    }
    case 'tiktok': {
      const { data } = await call('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', { headers: bearer });
      const u = data.data?.user ?? {};
      return [{ externalId: u.open_id ?? t.open_id, name: u.display_name ?? 'TikTok', handle: u.display_name ?? 'TikTok' }];
    }
    case 'linkedin': {
      const { data } = await call('https://api.linkedin.com/v2/userinfo', { headers: bearer });
      return [{ externalId: data.sub, name: data.name, handle: data.name, meta: { author: `urn:li:person:${data.sub}` } }];
    }
    case 'x': {
      const { data } = await call('https://api.x.com/2/users/me', { headers: bearer });
      return [{ externalId: data.data.id, name: data.data.name, handle: `@${data.data.username}` }];
    }
  }
}

// ---------- Publikasi ----------

export interface Media {
  url: string;
  kind: string;
  name: string;
}

export interface PublishInput {
  platform: SocialPlatform;
  token: string;
  externalId: string;
  handle: string;
  meta: Record<string, any>;
  format: string;
  title?: string | null;
  caption: string;
  media: Media[];
  /** Status proses sebelumnya (untuk melanjutkan unggahan yang belum selesai). */
  remote?: Record<string, any> | null;
}

export interface PublishResult {
  status: 'tayang' | 'memproses';
  externalId?: string;
  url?: string;
  remote?: Record<string, any>;
}

const VIDEO_FORMATS = ['video', 'short', 'reels'];
const pick = (media: Media[], kind: 'video' | 'gambar') => media.filter((m) => m.kind === kind && /^https?:\/\//.test(m.url));

function needMedia(input: PublishInput, kind: 'video' | 'gambar') {
  const list = pick(input.media, kind);
  if (!list.length) {
    throw new PlatformError(`Butuh lampiran ${kind === 'video' ? 'video' : 'gambar'} dengan URL publik (mis. dari penyimpanan file) untuk format ${input.format}`);
  }
  return list;
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  const bearer = { Authorization: `Bearer ${input.token}` };
  switch (input.platform) {
    case 'youtube': {
      const [video] = needMedia(input, 'video');
      const src = await fetch(video.url, { signal: AbortSignal.timeout(600_000) });
      if (!src.ok) throw new PlatformError(`Gagal mengambil video dari ${video.url} (${src.status})`);
      const buf = Buffer.from(await src.arrayBuffer());
      const type = src.headers.get('content-type') || 'video/mp4';
      const init = await call('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: { ...bearer, 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(buf.length) },
        json: {
          snippet: { title: (input.title || input.caption.split('\n')[0] || 'Video').slice(0, 100), description: input.caption.slice(0, 5000), categoryId: '22' },
          status: { privacyStatus: process.env.YOUTUBE_PRIVACY || 'public', selfDeclaredMadeForKids: false },
        },
      });
      const location = init.headers.get('location');
      if (!location) throw new PlatformError('YouTube tidak memberi URL unggahan');
      const up = await call(location, { method: 'PUT', headers: { ...bearer, 'Content-Type': type }, body: buf, signal: AbortSignal.timeout(900_000) });
      return { status: 'tayang', externalId: up.data.id, url: `https://www.youtube.com/watch?v=${up.data.id}` };
    }

    case 'instagram': {
      const ig = input.externalId;
      const token = encodeURIComponent(input.token);
      let container = input.remote?.container as string | undefined;
      if (!container) {
        let body: Record<string, string>;
        if (input.format === 'carousel') {
          const imgs = needMedia(input, 'gambar').slice(0, 10);
          const children: string[] = [];
          for (const m of imgs) children.push((await call(`${GRAPH}/${ig}/media?access_token=${token}`, { method: 'POST', form: { image_url: m.url, is_carousel_item: 'true' } })).data.id);
          body = { media_type: 'CAROUSEL', children: children.join(','), caption: input.caption };
        } else if (VIDEO_FORMATS.includes(input.format)) {
          body = { media_type: 'REELS', video_url: needMedia(input, 'video')[0].url, caption: input.caption };
        } else if (input.format === 'story') {
          const v = pick(input.media, 'video')[0];
          body = v ? { media_type: 'STORIES', video_url: v.url } : { media_type: 'STORIES', image_url: needMedia(input, 'gambar')[0].url };
        } else {
          body = { image_url: needMedia(input, 'gambar')[0].url, caption: input.caption };
        }
        container = (await call(`${GRAPH}/${ig}/media?access_token=${token}`, { method: 'POST', form: body })).data.id;
      }
      const st = (await call(`${GRAPH}/${container}?fields=status_code&access_token=${token}`)).data.status_code;
      if (st === 'ERROR' || st === 'EXPIRED') throw new PlatformError(`Instagram gagal memproses media (${st})`);
      if (st !== 'FINISHED') return { status: 'memproses', remote: { container } };
      const id = (await call(`${GRAPH}/${ig}/media_publish?access_token=${token}`, { method: 'POST', form: { creation_id: container } })).data.id;
      const link = (await call(`${GRAPH}/${id}?fields=permalink&access_token=${token}`)).data.permalink;
      return { status: 'tayang', externalId: id, url: link };
    }

    case 'facebook': {
      const page = input.externalId;
      const token = encodeURIComponent(input.token);
      let r;
      if (VIDEO_FORMATS.includes(input.format)) r = await call(`${GRAPH}/${page}/videos?access_token=${token}`, { method: 'POST', form: { file_url: needMedia(input, 'video')[0].url, description: input.caption } });
      else if (pick(input.media, 'gambar').length) r = await call(`${GRAPH}/${page}/photos?access_token=${token}`, { method: 'POST', form: { url: pick(input.media, 'gambar')[0].url, caption: input.caption } });
      else r = await call(`${GRAPH}/${page}/feed?access_token=${token}`, { method: 'POST', form: { message: input.caption } });
      const id = r.data.post_id ?? r.data.id;
      return { status: 'tayang', externalId: id, url: `https://www.facebook.com/${id}` };
    }

    case 'tiktok': {
      let publishId = input.remote?.publish_id as string | undefined;
      if (!publishId) {
        const r = await call('https://open.tiktokapis.com/v2/post/publish/video/init/', {
          method: 'POST',
          headers: bearer,
          json: {
            post_info: { title: input.caption.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY || 'SELF_ONLY', disable_comment: false },
            source_info: { source: 'PULL_FROM_URL', video_url: needMedia(input, 'video')[0].url },
          },
        });
        publishId = r.data.data.publish_id;
      }
      const s = (await call('https://open.tiktokapis.com/v2/post/publish/status/fetch/', { method: 'POST', headers: bearer, json: { publish_id: publishId } })).data.data;
      if (s.status === 'FAILED') throw new PlatformError(`TikTok gagal: ${s.fail_reason}`);
      if (s.status !== 'PUBLISH_COMPLETE') return { status: 'memproses', remote: { publish_id: publishId } };
      const id = s.publicaly_available_post_id?.[0];
      return { status: 'tayang', externalId: id ? String(id) : publishId, url: id ? `https://www.tiktok.com/${input.handle.startsWith('@') ? input.handle : '@' + input.handle}/video/${id}` : undefined };
    }

    case 'linkedin': {
      if (input.media.length && !['teks', 'thread', 'artikel'].includes(input.format)) {
        throw new PlatformError('Postingan LinkedIn dengan media belum didukung; ubah akun ke mode manual atau pakai format teks');
      }
      const r = await call('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: { ...bearer, 'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202509', 'X-Restli-Protocol-Version': '2.0.0' },
        json: {
          author: input.meta.author ?? `urn:li:person:${input.externalId}`,
          commentary: input.caption,
          visibility: 'PUBLIC',
          distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        },
      });
      const id = r.headers.get('x-restli-id') ?? '';
      return { status: 'tayang', externalId: id, url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
    }

    case 'x': {
      if (input.media.length && !['teks', 'thread'].includes(input.format)) throw new PlatformError('Postingan X dengan media belum didukung; pakai mode manual');
      // Thread: paragraf dipisah baris kosong, tiap bagian maks. 280 karakter.
      const parts = input.format === 'thread' ? input.caption.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : [input.caption.trim()];
      if (parts.some((x) => x.length > 280)) throw new PlatformError('Ada bagian lebih dari 280 karakter');
      let first: string | undefined;
      let prev: string | undefined;
      for (const text of parts) {
        const r = await call('https://api.x.com/2/tweets', { method: 'POST', headers: bearer, json: { text, ...(prev ? { reply: { in_reply_to_tweet_id: prev } } : {}) } });
        prev = r.data.data.id;
        first ??= prev;
      }
      return { status: 'tayang', externalId: first, url: `https://x.com/${input.handle.replace('@', '')}/status/${first}` };
    }
  }
}

// ---------- Statistik ----------

export interface Metrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/** null = platform tidak menyediakan statistik untuk izin ini. */
export async function fetchMetrics(platform: SocialPlatform, token: string, externalId: string): Promise<Metrics | null> {
  const bearer = { Authorization: `Bearer ${token}` };
  switch (platform) {
    case 'youtube': {
      const { data } = await call(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${externalId}`, { headers: bearer });
      const s = data.items?.[0]?.statistics ?? {};
      return { views: n(s.viewCount), likes: n(s.likeCount), comments: n(s.commentCount), shares: 0 };
    }
    case 'instagram': {
      const t = encodeURIComponent(token);
      const { data } = await call(`${GRAPH}/${externalId}?fields=like_count,comments_count&access_token=${t}`);
      let views = 0;
      let shares = 0;
      try {
        const ins = (await call(`${GRAPH}/${externalId}/insights?metric=views,shares&access_token=${t}`)).data.data ?? [];
        for (const m of ins) {
          if (m.name === 'views') views = n(m.values?.[0]?.value);
          if (m.name === 'shares') shares = n(m.values?.[0]?.value);
        }
      } catch {
        /* insights tidak tersedia untuk semua jenis media */
      }
      return { views, likes: n(data.like_count), comments: n(data.comments_count), shares };
    }
    case 'facebook': {
      const { data } = await call(`${GRAPH}/${externalId}?fields=shares,reactions.summary(total_count),comments.summary(total_count)&access_token=${encodeURIComponent(token)}`);
      return { views: 0, likes: n(data.reactions?.summary?.total_count), comments: n(data.comments?.summary?.total_count), shares: n(data.shares?.count) };
    }
    case 'tiktok': {
      const { data } = await call('https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count', {
        method: 'POST',
        headers: bearer,
        json: { filters: { video_ids: [externalId] } },
      });
      const v = data.data?.videos?.[0];
      return v ? { views: n(v.view_count), likes: n(v.like_count), comments: n(v.comment_count), shares: n(v.share_count) } : null;
    }
    case 'x': {
      const { data } = await call(`https://api.x.com/2/tweets/${externalId}?tweet.fields=public_metrics`, { headers: bearer });
      const m = data.data?.public_metrics ?? {};
      return { views: n(m.impression_count), likes: n(m.like_count), comments: n(m.reply_count), shares: n(m.retweet_count) + n(m.quote_count) };
    }
    case 'linkedin':
      return null;
  }
}
