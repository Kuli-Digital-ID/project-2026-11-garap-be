import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordUtil } from '@common/utils/password.util';
import { memberInclude, toMember } from '@common/serializers';
import { AuditService } from '@modules/activity/audit.service';
import { LoginDto } from './core/dto/login.dto';
import { JwtPayload } from './core/interfaces/jwt-payload.interface';
import { keycloakEndpoints, pkce, randomState, safeRedirect } from './core/helpers/oidc';

const authInclude = {
  ...memberInclude,
  position: { include: { position_permissions: { include: { permission: true } } } },
} as const;

/** Cookie berisi state OIDC selama perjalanan ke Keycloak dan kembali (10 menit). */
export const SSO_COOKIE = 'garap_sso';
interface SsoState {
  state: string;
  verifier: string;
  redirect: string;
}

export class SsoError extends Error {
  constructor(public readonly code: 'tidak-terdaftar' | 'nonaktif' | 'sso-gagal' | 'sso-belum-diatur') {
    super(code);
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private get kc() {
    return this.config.get<{ issuer: string; clientId: string; clientSecret: string; redirectUri: string }>('auth.keycloak')!;
  }

  get ssoEnabled() {
    const k = this.kc;
    return !!(k.issuer && k.clientId && k.redirectUri);
  }

  get passwordLoginEnabled() {
    return this.config.get<boolean>('auth.passwordLogin') === true;
  }

  get frontendUrl() {
    return this.config.get<string>('app.frontendUrl')!;
  }

  getConfig() {
    return { sso: this.ssoEnabled, passwordLogin: this.passwordLoginEnabled, issuer: this.kc.issuer || null };
  }

  // ---------- SSO ----------

  /** Langkah 1: URL authorize Keycloak + state yang disimpan di cookie. */
  startSso(redirect?: string) {
    if (!this.ssoEnabled) throw new SsoError('sso-belum-diatur');
    const { verifier, challenge } = pkce();
    const state = randomState();
    const k = this.kc;
    const url = new URL(keycloakEndpoints(k.issuer).authorize);
    url.search = new URLSearchParams({
      client_id: k.clientId,
      redirect_uri: k.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    const cookie = this.jwtService.sign({ state, verifier, redirect: safeRedirect(redirect) } satisfies SsoState, { expiresIn: '10m' });
    return { url: url.toString(), cookie };
  }

  /** Langkah 2: tukar code → token, ambil email dari userinfo, cocokkan dengan akun terdaftar. */
  async finishSso(params: { code?: string; state?: string; cookie?: string; ip?: string }) {
    if (!this.ssoEnabled) throw new SsoError('sso-belum-diatur');
    let saved: SsoState;
    try {
      saved = this.jwtService.verify<SsoState>(params.cookie ?? '');
    } catch {
      throw new SsoError('sso-gagal');
    }
    if (!params.code || !params.state || params.state !== saved.state) throw new SsoError('sso-gagal');

    const k = this.kc;
    const ep = keycloakEndpoints(k.issuer);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: k.redirectUri,
      client_id: k.clientId,
      code_verifier: saved.verifier,
    });
    if (k.clientSecret) body.set('client_secret', k.clientSecret);

    const tokenRes = await fetch(ep.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!tokenRes.ok) {
      this.logger.warn(`Token Keycloak ditolak: ${tokenRes.status} ${await tokenRes.text()}`);
      throw new SsoError('sso-gagal');
    }
    const tokens = (await tokenRes.json()) as { access_token: string };
    const infoRes = await fetch(ep.userinfo, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!infoRes.ok) throw new SsoError('sso-gagal');
    const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean };
    if (!info.email || info.email_verified === false) throw new SsoError('sso-gagal');

    // Akun hanya dibuat oleh Owner/Admin. SSO sekadar membuktikan identitas.
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: info.email, mode: 'insensitive' }, kind: 'human', deleted_at: null },
    });
    if (!user) {
      await this.audit.log(null, 'login SSO ditolak (email tidak terdaftar)', info.email, 'keamanan', params.ip);
      throw new SsoError('tidak-terdaftar');
    }
    if (!user.is_active) throw new SsoError('nonaktif');
    if (user.sso_subject && user.sso_subject !== info.sub) {
      this.logger.warn(`sso_subject berbeda untuk ${user.email}`);
      throw new SsoError('sso-gagal');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { sso_subject: info.sub, last_login_at: new Date(), status: 'online' },
    });
    await this.audit.log(user.id, 'masuk', 'SSO Keycloak', 'keamanan', params.ip);
    return { token: await this.issueToken(user.id), redirect: saved.redirect };
  }

  logoutUrl() {
    if (!this.ssoEnabled) return null;
    const url = new URL(keycloakEndpoints(this.kc.issuer).logout);
    url.search = new URLSearchParams({ client_id: this.kc.clientId, post_logout_redirect_uri: `${this.frontendUrl}/masuk` }).toString();
    return url.toString();
  }

  // ---------- Password (pengembangan lokal) ----------

  async passwordLogin({ email, password }: LoginDto, ip?: string) {
    if (!this.passwordLoginEnabled) throw new NotFoundException('Login password tidak aktif. Gunakan SSO.');
    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, deleted_at: null } });
    if (!user || !user.password || !(await PasswordUtil.compare(password, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    if (!user.is_active) throw new ForbiddenException('Akun nonaktif');
    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    await this.audit.log(user.id, 'masuk', 'Password (mode pengembangan)', 'keamanan', ip);
    return { token: await this.issueToken(user.id), me: await this.me(user.id) };
  }

  // ---------- Umum ----------

  async buildPayload(userId: number): Promise<JwtPayload | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: authInclude });
    if (!user || !user.is_active || user.deleted_at) return null;
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      kind: user.kind,
      positionId: user.position_id,
      positionName: user.position.name,
      permissions: user.position.position_permissions.map((pp) => pp.permission.name),
    };
  }

  async issueToken(userId: number) {
    const payload = await this.buildPayload(userId);
    if (!payload) throw new UnauthorizedException('Akun tidak ditemukan atau nonaktif');
    return this.jwtService.sign(payload);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: authInclude });
    if (!user) throw new UnauthorizedException();
    return {
      ...toMember(user),
      email: user.email,
      permissions: user.position.position_permissions.map((pp) => pp.permission.name),
    };
  }
}
