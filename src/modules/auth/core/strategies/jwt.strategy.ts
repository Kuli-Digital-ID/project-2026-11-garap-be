import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
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
        // Untuk agent/skrip: header Authorization: Bearer <token>
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /** Izin selalu dibaca ulang dari database agar perubahan hak akses langsung berlaku. */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const fresh = await this.auth.buildPayload(payload.userId);
    if (!fresh) throw new UnauthorizedException('Akun tidak ditemukan atau nonaktif');
    return fresh;
  }
}
