import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import ms, { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { Public } from '@common/decorators/public.decorator';
import { GetUser } from '@common/decorators/get-user.decorator';
import { ApiSuccessResponse } from '@common/decorators/api-response.decorator';
import { AuthService, SSO_COOKIE, SsoError } from '../../auth.service';
import { LoginDto } from '../../core/dto/login.dto';
import { AuthConfigDto, LogoutResponseDto, MeDto } from '../../core/dto/auth-response.dto';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieBase(): CookieOptions {
    return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
  }

  private setSession(res: Response, token: string) {
    const maxAge = ms((this.config.get<string>('jwt.expiresIn') ?? '7d') as StringValue);
    res.cookie('Authentication', token, { ...this.cookieBase(), maxAge });
  }

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Metode login yang tersedia (dipakai halaman /masuk)' })
  @ApiSuccessResponse(AuthConfigDto)
  getConfig() {
    return this.auth.getConfig();
  }

  @Public()
  @Get('sso/login')
  @ApiOperation({ summary: 'Mulai login SSO: redirect ke halaman login Keycloak' })
  @ApiQuery({ name: 'redirect', required: false, description: 'Path FE setelah berhasil masuk, mis. /proyek/pinarak' })
  @ApiResponse({ status: 302 })
  ssoLogin(@Query('redirect') redirect: string | undefined, @Res() res: Response) {
    try {
      const { url, cookie } = this.auth.startSso(redirect);
      res.cookie(SSO_COOKIE, cookie, { ...this.cookieBase(), maxAge: 10 * 60 * 1000 });
      return res.redirect(url);
    } catch (e) {
      const code = e instanceof SsoError ? e.code : 'sso-gagal';
      return res.redirect(`${this.auth.frontendUrl}/masuk?error=${code}`);
    }
  }

  @Public()
  @Get('sso/callback')
  @ApiOperation({ summary: 'Callback dari Keycloak (daftarkan URL ini sebagai Valid Redirect URI)' })
  @ApiResponse({ status: 302 })
  async ssoCallback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    res.clearCookie(SSO_COOKIE, this.cookieBase());
    try {
      const result = await this.auth.finishSso({ code, state, cookie: req.cookies?.[SSO_COOKIE], ip });
      this.setSession(res, result.token);
      return res.redirect(`${this.auth.frontendUrl}${result.redirect}`);
    } catch (e) {
      const errCode = e instanceof SsoError ? e.code : 'sso-gagal';
      return res.redirect(`${this.auth.frontendUrl}/masuk?error=${errCode}`);
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login email + password — hanya aktif bila AUTH_PASSWORD_LOGIN=true (pengembangan)' })
  @ApiSuccessResponse(MeDto)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    const { token, me } = await this.auth.passwordLogin(dto, ip);
    this.setSession(res, token);
    return me;
  }

  @Get('me')
  @ApiOperation({ summary: 'Akun yang sedang masuk beserta izinnya' })
  @ApiSuccessResponse(MeDto)
  me(@GetUser() user: JwtPayload) {
    return this.auth.me(user.userId);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Keluar. FE lalu membuka logoutUrl untuk mengakhiri sesi Keycloak.' })
  @ApiSuccessResponse(LogoutResponseDto)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('Authentication', this.cookieBase());
    return { logoutUrl: this.auth.logoutUrl() };
  }
}
