import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';

/**
 * JWT Refresh Token Strategy.
 * Extracts refresh token from Authorization header and validates it.
 */
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: { sub: string; email: string }) {
    const refreshToken = req.get('Authorization')?.replace('Bearer ', '').trim();
    return {
      userId: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
