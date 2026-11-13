import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@common/decorators/public.decorator';
import { GetUser } from '@common/decorators/get-user.decorator';
import { AllowPendingPassword } from '@common/decorators/password-change.decorator';
import { ApiSuccessResponse } from '@common/decorators/api-response.decorator';
import { AuthService } from '../../auth.service';
import { ChangePasswordDto, LoginDto } from '../../core/dto/login.dto';
import { LoginResponseDto, LogoutResponseDto, MeDto } from '../../core/dto/auth-response.dto';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';

export const SESSION_COOKIE = 'Authentication';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieBase(): CookieOptions {
    const { sameSite, domain } = this.config.get<{ sameSite: 'lax' | 'strict' | 'none'; domain?: string }>('auth.cookie')!;
    // SameSite=None hanya diterima browser bila Secure.
    return { httpOnly: true, secure: process.env.NODE_ENV === 'production' || sameSite === 'none', sameSite, domain, path: '/' };
  }

  private setSession(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, { ...this.cookieBase(), maxAge: this.auth.sessionMs });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Masuk dengan email + password',
    description:
      'Sesi langsung disimpan di cookie httpOnly "Authentication": Swagger dan FE (fetch dengan credentials: "include") ' +
      'otomatis memakainya, tidak perlu menyalin token. Peran & izin lengkap ada di GET /auth/me. ' +
      'Salah password berulang → 429 ACCOUNT_LOCKED. Bila mustChangePassword = true, arahkan ke ganti password.',
  })
  @ApiSuccessResponse(LoginResponseDto)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    const { token, user } = await this.auth.login(dto, ip);
    this.setSession(res, token);
    return user;
  }

  @Get('me')
  @AllowPendingPassword()
  @ApiOperation({ summary: 'Akun yang sedang masuk beserta peran dan izinnya' })
  @ApiSuccessResponse(MeDto)
  me(@GetUser() user: JwtPayload) {
    return this.auth.me(user.userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @AllowPendingPassword()
  @ApiOperation({ summary: 'Ganti password sendiri. Sesi di perangkat lain berakhir; perangkat ini mendapat token baru.' })
  @ApiSuccessResponse(LoginResponseDto)
  async changePassword(@GetUser() user: JwtPayload, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    const session = await this.auth.changePassword(user, dto, ip);
    this.setSession(res, session.token);
    return session.user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Keluar: menghapus cookie sesi' })
  @ApiSuccessResponse(LogoutResponseDto)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    res.clearCookie(SESSION_COOKIE, this.cookieBase());
    return this.auth.logout(req.cookies?.[SESSION_COOKIE] ?? bearer);
  }
}
