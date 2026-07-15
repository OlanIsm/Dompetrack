import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockUser = {
    id: 'user-123',
    name: 'Olan',
    email: 'olan@dompetrack.com',
    passwordHash: 'hashed-password',
    refreshToken: 'hashed-refresh-token',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      createMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockImplementation(async (payload, options) => {
      if (options.secret === 'access-secret') {
        return 'mock-access-token';
      }
      return 'mock-refresh-token';
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRY') return '15m';
      if (key === 'JWT_REFRESH_EXPIRY') return '7d';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.category.createMany.mockResolvedValue({ count: 4 });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-new-refresh-token',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register({
        name: 'Olan',
        email: 'olan@dompetrack.com',
        password: 'password123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'olan@dompetrack.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.category.createMany).toHaveBeenCalled();
      expect(result).toEqual({
        user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          name: 'Olan',
          email: 'olan@dompetrack.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'olan@dompetrack.com',
        password: 'password123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'olan@dompetrack.com' },
      });
      expect(result).toEqual({
        user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@dompetrack.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'olan@dompetrack.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.refreshTokens(
        'user-123',
        'valid-refresh-token',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw ForbiddenException if user has no refresh token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens('user-123', 'some-refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if refresh token comparison fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-123', 'invalid-refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      const result = await service.logout('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshToken: null },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
