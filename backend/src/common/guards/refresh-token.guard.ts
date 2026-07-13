import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for refresh token endpoints.
 * Uses 'jwt-refresh' strategy to validate refresh tokens.
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
