import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SOCIAL_PLATFORMS, SocialPlatform } from '@common/constants/domain.constant';
import { SecretBox } from '@common/utils/secret-box.util';
import { channelInclude, toChannel } from '@common/serializers';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { pkce, randomState, safeRedirect } from '@common/utils/oauth.util';
import { ManualChannelDto, UpdateChannelDto } from './core/dto/content.dto';
import { OAUTH, PlatformError, authorizeUrl, exchangeCode, identities, oauthReady, refreshToken } from './core/helpers/platforms';

const LABEL: Record<SocialPlatform, string> = { youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X' };

interface OAuthState {
  state: string;
  verifier: string;
  platform: SocialPlatform;
  userId: number;
  projects: string[];
  redirect: string;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private check(p: string): SocialPlatform {
    if (!(SOCIAL_PLATFORMS as readonly string[]).includes(p)) throw new NotFoundException(`Platform "${p}" tidak dikenal`);
    return p as SocialPlatform;
  }

  private redirectUri(p: SocialPlatform) {
    const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');
    return `${base}/api/v1/social/oauth/callback/${p}`;
  }

  private get frontendUrl() {
    return this.config.get<string>('app.frontendUrl')!;
  }

  private async projectIds(slugs: string[] = []) {
    const rows = await this.prisma.project.findMany({ where: { slug: { in: slugs }, deleted_at: null }, select: { id: true, slug: true } });
    const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
    if (missing.length) throw new BadRequestException(`Proyek tidak ditemukan: ${missing.join(', ')}`);
    return rows.map((r) => r.id);
  }

  /** Status aplikasi developer tiap platform (sudah diisi di .env atau belum). */
  platforms() {
    return SOCIAL_PLATFORMS.map((p) => ({ id: p, name: LABEL[p], oauthReady: oauthReady(p), redirectUri: this.redirectUri(p), scopes: OAUTH[p].scopes }));
  }

  async list(projectSlug?: string) {
    const rows = await this.prisma.socialChannel.findMany({
      where: { deleted_at: null, ...(projectSlug ? { projects: { some: { project: { slug: projectSlug } } } } : {}) },
      include: channelInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toChannel);
  }

  async createManual(user: JwtPayload, dto: ManualChannelDto) {
    const row = await this.prisma.socialChannel.create({
      data: {
        platform: dto.platform, name: dto.name, handle: dto.handle, mode: 'manual', added_by: user.userId,
        projects: { create: (await this.projectIds(dto.projects)).map((project_id) => ({ project_id })) },
      },
      include: channelInclude,
    });
    await this.audit.log(user.userId, 'menambahkan akun sosmed (manual)', `${LABEL[dto.platform as SocialPlatform]} ${dto.handle}`, 'akses');
    return toChannel(row);
  }

  async update(user: JwtPayload, id: number, dto: UpdateChannelDto) {
    const c = await this.prisma.socialChannel.findFirst({ where: { id, deleted_at: null } });
    if (!c) throw new NotFoundException('Akun sosmed tidak ditemukan');
    if (dto.mode === 'otomatis' && !c.access_token_enc) throw new BadRequestException('Mode otomatis butuh login ke platform. Hubungkan akun lewat tombol login.');
    await this.prisma.$transaction(async (tx) => {
      await tx.socialChannel.update({ where: { id }, data: { mode: dto.mode, name: dto.name, handle: dto.handle } });
      if (dto.projects) {
        const ids = await this.projectIds(dto.projects);
        await tx.projectChannel.deleteMany({ where: { channel_id: id } });
        await tx.projectChannel.createMany({ data: ids.map((project_id) => ({ project_id, channel_id: id })) });
      }
    });
    return toChannel(await this.prisma.socialChannel.findUniqueOrThrow({ where: { id }, include: channelInclude }));
  }

  async remove(user: JwtPayload, id: number) {
    const c = await this.prisma.socialChannel.findFirst({ where: { id, deleted_at: null } });
    if (!c) throw new NotFoundException('Akun sosmed tidak ditemukan');
    const pending = await this.prisma.contentPost.count({ where: { channel_id: id, status: { in: ['terjadwal', 'memproses'] } } });
    if (pending) throw new ConflictException(`${pending} postingan terjadwal masih memakai akun ini`);
    await this.prisma.socialChannel.update({
      where: { id },
      data: { deleted_at: new Date(), access_token_enc: null, refresh_token_enc: null, external_id: c.external_id ? `${c.external_id}~${id}` : null },
    });
    await this.audit.log(user.userId, 'memutuskan akun sosmed', `${LABEL[c.platform as SocialPlatform]} ${c.handle}`, 'akses');
    return { deleted: true };
  }

  // ---------- OAuth ----------

  startOAuth(user: JwtPayload, platformParam: string, projects: string[], redirect?: string) {
    const platform = this.check(platformParam);
    if (!oauthReady(platform)) {
      throw new BadRequestException(`Aplikasi ${LABEL[platform]} belum diatur: isi ${OAUTH[platform].clientIdEnv} dan ${OAUTH[platform].clientSecretEnv} di .env`);
    }
    const { verifier, challenge } = pkce();
    const state = randomState();
    const signed = this.jwt.sign({ state, verifier, platform, userId: user.userId, projects, redirect: safeRedirect(redirect ?? '/pengaturan/sosmed') } satisfies OAuthState, { expiresIn: '15m' });
    return { url: authorizeUrl(platform, this.redirectUri(platform), signed, challenge) };
  }

  /** Callback OAuth: simpan token terenkripsi untuk tiap akun yang bisa dikelola. Mengembalikan URL FE tujuan. */
  async finishOAuth(platformParam: string, code?: string, stateParam?: string, error?: string) {
    const platform = this.check(platformParam);
    let st: OAuthState;
    try {
      st = this.jwt.verify<OAuthState>(stateParam ?? '');
    } catch {
      return `${this.frontendUrl}/pengaturan/sosmed?error=sosmed-gagal`;
    }
    const back = (q: string) => `${this.frontendUrl}${st.redirect}${st.redirect.includes('?') ? '&' : '?'}${q}`;
    if (error || !code || st.platform !== platform) return back('error=sosmed-dibatalkan');
    try {
      const tokens = await exchangeCode(platform, code, this.redirectUri(platform), st.verifier);
      const accounts = await identities(platform, tokens);
      if (!accounts.length) return back(`error=${platform === 'instagram' ? 'ig-bukan-bisnis' : 'akun-tidak-ditemukan'}`);
      const projectIds = await this.projectIds(st.projects);
      for (const a of accounts) {
        const data = {
          name: a.name,
          handle: a.handle,
          mode: 'otomatis',
          status: 'terhubung',
          access_token_enc: SecretBox.seal(a.token ?? tokens.access_token),
          refresh_token_enc: tokens.refresh_token ? SecretBox.seal(tokens.refresh_token) : null,
          token_expires_at: a.token ? null : tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          scopes: OAUTH[platform].scopes,
          meta: (a.meta ?? {}) as Prisma.InputJsonValue,
          deleted_at: null,
        };
        const row = await this.prisma.socialChannel.upsert({
          where: { platform_external_id: { platform, external_id: a.externalId } },
          create: { platform, external_id: a.externalId, added_by: st.userId, ...data },
          update: data,
        });
        await this.prisma.projectChannel.createMany({ data: projectIds.map((project_id) => ({ project_id, channel_id: row.id })), skipDuplicates: true });
        await this.audit.log(st.userId, 'menghubungkan akun sosmed', `${LABEL[platform]} ${a.handle}`, 'akses');
      }
      return back(`terhubung=${platform}`);
    } catch (e) {
      this.logger.warn(`OAuth ${platform} gagal: ${(e as Error).message}`);
      return back('error=sosmed-gagal');
    }
  }

  /** Token siap pakai untuk API platform (diperbarui otomatis bila hampir kedaluwarsa). */
  async tokenFor(channelId: number): Promise<string> {
    const c = await this.prisma.socialChannel.findUniqueOrThrow({ where: { id: channelId } });
    if (!c.access_token_enc) throw new PlatformError('Akun ini mode manual (tanpa login platform)');
    const soon = c.token_expires_at && c.token_expires_at.getTime() < Date.now() + 5 * 60_000;
    if (!soon) return SecretBox.open(c.access_token_enc);
    if (!c.refresh_token_enc) {
      await this.prisma.socialChannel.update({ where: { id: c.id }, data: { status: 'perlu-login-ulang' } });
      throw new PlatformError('Token kedaluwarsa; hubungkan ulang akun');
    }
    try {
      const t = await refreshToken(c.platform as SocialPlatform, SecretBox.open(c.refresh_token_enc));
      await this.prisma.socialChannel.update({
        where: { id: c.id },
        data: {
          access_token_enc: SecretBox.seal(t.access_token),
          refresh_token_enc: t.refresh_token ? SecretBox.seal(t.refresh_token) : c.refresh_token_enc,
          token_expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
          status: 'terhubung',
        },
      });
      return t.access_token;
    } catch (e) {
      await this.prisma.socialChannel.update({ where: { id: c.id }, data: { status: 'perlu-login-ulang' } });
      throw e;
    }
  }
}
