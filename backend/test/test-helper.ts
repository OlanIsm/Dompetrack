import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';
import { App } from 'supertest/types';

export async function bootstrapTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.setGlobalPrefix('api');

  await app.init();
  return app;
}

export async function createE2eUser(
  app: INestApplication<App>,
  email: string,
  name: string,
) {
  const registerPayload = {
    email,
    name,
    password: 'PasswordE2E123!',
  };

  // Register
  const regRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(registerPayload);

  if (regRes.status !== 201) {
    throw new Error(
      `Failed to register test user: ${JSON.stringify(regRes.body)}`,
    );
  }

  const userId = regRes.body.data.user.id;

  // Login
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email,
      password: registerPayload.password,
    });

  if (loginRes.status !== 200) {
    throw new Error(
      `Failed to login test user: ${JSON.stringify(loginRes.body)}`,
    );
  }

  const token = loginRes.body.data.accessToken;

  return {
    userId,
    token,
    authHeader: `Bearer ${token}`,
  };
}

export async function cleanupUser(app: INestApplication<App>, userId: string) {
  const prisma = app.get(PrismaService);
  // Deleting user cascades to categories and transactions
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (err) {
    console.error(`Cleanup failed for user ${userId}:`, err);
  }
}
