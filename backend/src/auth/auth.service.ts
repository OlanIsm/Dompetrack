import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user.
   * - Checks for duplicate email
   * - Hashes password with bcrypt (12 salt rounds)
   * - Creates default categories for the user
   * - Returns access + refresh tokens
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password — NEVER store plaintext passwords
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    // Create default categories for the new user
    await this.prisma.category.createMany({
      data: [
        { name: 'Makanan', icon: '🍔', color: '#FF6B6B', isDefault: true, userId: user.id },
        { name: 'Primer', icon: '🏠', color: '#4ECDC4', isDefault: true, userId: user.id },
        { name: 'Hobi', icon: '🎮', color: '#45B7D1', isDefault: true, userId: user.id },
        { name: 'Lainnya', icon: '📦', color: '#96CEB4', isDefault: true, userId: user.id },
      ],
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens,
    };
  }

  /**
   * Login with email and password.
   * - Validates credentials against bcrypt hash
   * - Returns access + refresh tokens
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens,
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   * - Validates refresh token hash matches stored hash
   * - Rotates both tokens for security
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatch) {
      throw new ForbiddenException('Access denied');
    }

    // Rotate tokens
    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Logout — clears the stored refresh token.
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
