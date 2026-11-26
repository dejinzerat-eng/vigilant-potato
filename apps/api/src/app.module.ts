import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './common/auth.guard';
import { MailerService, SmsService } from './common/mailer.service';
import { PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';
import { HealthController } from './health.controller';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { ListingsController } from './listings/listings.controller';
import { ListingsService } from './listings/listings.service';
import { MediaController } from './media/media.controller';
import { StorageService } from './media/storage.service';
import { MessagesController } from './messages/messages.controller';
import { SearchService } from './search/search.service';
import { UsersController } from './users/users.controller';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }])],
  controllers: [HealthController, AuthController, ListingsController, MessagesController, UsersController, MediaController, AdminController, JobsController],
  providers: [
    PrismaService, RedisService, MailerService, SmsService, StorageService, SearchService, AuthService, ListingsService, JobsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
