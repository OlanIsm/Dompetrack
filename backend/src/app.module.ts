import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards';
import { Public } from './common/decorators';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHealth() {
    return { status: 'ok', message: 'Dompetrack API is running successfully' };
  }
}

@Module({
  controllers: [AppController],
  imports: [
    // Load .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: max 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
  ],
  providers: [
    // Global JWT guard — all routes require auth by default
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiter
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
