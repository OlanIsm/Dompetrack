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
  logger.log(`🔒 Security: Helmet ✅ | CORS ✅ | Rate Limit ✅ | Validation ✅`);
}

bootstrap();
