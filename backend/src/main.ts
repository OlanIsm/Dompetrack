import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Validate critical env secrets
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

  if (nodeEnv === 'production') {
    if (
      !accessSecret ||
      accessSecret.includes('change-me-in-production') ||
      accessSecret.length < 32
    ) {
      throw new Error(
        'FATAL: JWT_ACCESS_SECRET must be at least 32 characters long and not contain the default placeholder in production mode!',
      );
    }
    if (
      !refreshSecret ||
      refreshSecret.includes('change-me-in-production') ||
      refreshSecret.length < 32
    ) {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET must be at least 32 characters long and not contain the default placeholder in production mode!',
      );
    }
  } else {
    if (!accessSecret || accessSecret.includes('change-me-in-production')) {
      logger.warn(
        '⚠️ JWT_ACCESS_SECRET is using the default placeholder value. Change this before production deployment!',
      );
    }
    if (!refreshSecret || refreshSecret.includes('change-me-in-production')) {
      logger.warn(
        '⚠️ JWT_REFRESH_SECRET is using the default placeholder value. Change this before production deployment!',
      );
    }
  }

  // ─── Security Layer 1: Helmet (HTTP security headers) ────────
  app.use(helmet());

  // ─── Security Layer 2: CORS ──────────────────────────────────
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Security Layer 3: Global Validation Pipe ────────────────
  // Automatically validates ALL incoming DTOs.
  // whitelist: strips unknown properties (prevents mass-assignment attacks)
  // forbidNonWhitelisted: rejects requests with unknown properties
  // transform: auto-transforms payloads to DTO instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Exception Filter ────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Global Response Interceptor ────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── API Prefix ─────────────────────────────────────────────
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Dompetrack Backend running on http://localhost:${port}/api`);
  logger.log(
    `🔒 Security: Helmet ✅ | CORS ✅ | Rate Limit ✅ | Validation ✅`,
  );
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
