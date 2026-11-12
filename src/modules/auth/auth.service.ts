import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import ms, { StringValue } from 'ms';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordUtil } from '@common/utils/password.util';
import { memberInclude, toMember } from '@common/serializers';
import { AuditService } from '@modules/activity/audit.service';
import { ChangePasswordDto, LoginDto } from './core/dto/login.dto';
import { JwtPayload, TokenClaims } from './core/interfaces/jwt-payload.interface';

const authInclude = {
  ...memberInclude,
  position: { include: { position_permissions: { include: { permission: true } } } },
} as const;

/** Dibandingkan saat email tidak terdaftar, supaya lama respons tidak membocorkan email mana yang ada. */
const DUMMY_HASH = '$2b$10$FMWNoMGjc5XGjR1uUy6SeOK3QUztpBiI0EpgOO3cRyyVrEg9kVS3e';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  get sessionMs(): number {
    return ms((this.config.get<string>('jwt.expiresIn') ?? '7d') as StringValue);
  }

  // ---------- Masuk ----------

  async login({ email, password }: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' }, kind: 'human', deleted_at: null },
    });
    if (!user || !user.password) {
      await PasswordUtil.compare(password, DUMMY_HASH);
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.locked_until && user.locked_until > new Date()) {
      const minutes = Math.max(1, Math.ceil((user.locked_until.getTime() - Date.now()) / 60000));
      throw new HttpException(
        { message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.`, errors: { code: 'ACCOUNT_LOCKED', retryAfterMinutes: minutes } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await PasswordUtil.compare(password, user.password))) {
      const max = this.config.get<number>('auth.maxFailedLogins') ?? 5;
      const failed = user.failed_logins + 1;
      const lock = failed >= max;
      await this.prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failed_logins: 0, locked_until: new Date(Date.now() + (this.config.get<number>('auth.lockMinutes') ?? 15) * 60000) }
          : { failed_logins: failed },
      });
      if (lock) await this.audit.log(user.id, 'akun dikunci sementara', `${max} kali salah password`, 'keamanan', ip);
      throw new UnauthorizedException('Email atau password salah');
    }

    if (!user.is_active) throw new ForbiddenException('Akun Anda dinonaktifkan. Hubungi Owner atau Admin.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failed_logins: 0, locked_until: null, last_login_at: new Date(), status: 'online' },
    });
    await this.audit.log(user.id, 'masuk', 'Email & password', 'keamanan', ip);
    return this.session(user.id);
  }

  /** Token boleh sudah kedaluwarsa atau kosong: keluar selalu berhasil. */
  async logout(token?: string) {
    try {
      const claims = this.jwtService.verify<TokenClaims>(token ?? '');
      await this.prisma.user.updateMany({ where: { id: claims.sub, status: 'online' }, data: { status: 'offline' } });
    } catch {
      /* tidak ada sesi yang valid */
    }
    return { loggedOut: true };
  }

  // ---------- Password ----------

  async changePassword(actor: JwtPayload, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.userId } });
    if (!user?.password || !(await PasswordUtil.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Password saat ini salah');
    }
    if (dto.newPassword === dto.currentPassword) throw new BadRequestException('Password baru harus berbeda dari password saat ini');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await PasswordUtil.hash(dto.newPassword), must_change_password: false, token_version: { increment: 1 } },
    });
    await this.audit.log(user.id, 'mengganti password', 'Akun sendiri', 'keamanan', ip);
    // Sesi di perangkat lain ikut berakhir; perangkat ini mendapat token baru.
    return this.session(user.id);
  }

  // ---------- Sesi ----------

  /** Dipanggil tiap request: token masih berlaku hanya bila akun aktif dan token_version cocok. */
  async resolve(claims: TokenClaims): Promise<JwtPayload | null> {
    if (typeof claims?.sub !== 'number') return null;
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub }, include: authInclude });
    if (!user || !user.is_active || user.deleted_at || user.token_version !== claims.tv) return null;
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      kind: user.kind,
      positionId: user.position_id,
      positionName: user.position.name,
      permissions: user.position.position_permissions.map((pp) => pp.permission.name),
      mustChangePassword: user.must_change_password,
    };
  }

  async issueToken(userId: number, expiresIn?: StringValue) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { token_version: true, is_active: true, deleted_at: true } });
    if (!user || !user.is_active || user.deleted_at) throw new UnauthorizedException('Akun tidak ditemukan atau nonaktif');
    return this.jwtService.sign({ sub: userId, tv: user.token_version } satisfies TokenClaims, expiresIn ? { expiresIn } : undefined);
  }

  private async session(userId: number) {
    return {
      accessToken: await this.issueToken(userId),
      expiresAt: new Date(Date.now() + this.sessionMs).toISOString(),
      user: await this.me(userId),
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: authInclude });
    if (!user) throw new UnauthorizedException();
    return {
      ...toMember(user),
      email: user.email,
      permissions: user.position.name === 'Owner' ? await this.allPermissions() : user.position.position_permissions.map((pp) => pp.permission.name),
      mustChangePassword: user.must_change_password,
    };
  }

  /** Owner selalu lolos semua pemeriksaan izin, jadi FE menerima daftar lengkap. */
  private async allPermissions() {
    return (await this.prisma.permission.findMany({ select: { name: true }, orderBy: { id: 'asc' } })).map((p) => p.name);
  }
}
