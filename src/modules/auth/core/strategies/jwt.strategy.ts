import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload, TokenClaims } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.Authentication,
        // FE lintas domain, agent, atau skrip: header Authorization: Bearer <token>
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /** Peran & izin selalu dibaca ulang dari database agar perubahan hak akses langsung berlaku. */
  async validate(claims: TokenClaims): Promise<JwtPayload> {
    const user = await this.auth.resolve(claims);
    if (!user) throw new UnauthorizedException('Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.');
    return user;
  }
}
