import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AIModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ConversationsModule } from './conversations/conversations.module';
import { CopyModule } from './copy/copy.module';
import { createTypeOrmConfig } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { ProjectModule } from './project/project.module';
import { QuotaModule } from './quota/quota.module';
import { LocalStorageModule } from './local-storage/local-storage.module';
import { RedisModule } from './database/redis.module';
import { UploadModule } from './upload/upload.module';

/**
 * 应用根模块（V2：对话式图文创作）
 *
 * 全局装配：
 *   - ConfigModule：环境变量加载（全局）
 *   - TypeOrmModule：数据库连接
 *   - ThrottlerModule：限流（按 IP）
 *   - JwtAuthGuard：全局 JWT 守卫（@Public() 例外）
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmConfig,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new RedisThrottlerStorageService({
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
        }),
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
    }),
    AdminModule,
    AnalyticsModule,
    AuthModule,
    CopyModule,
    LocalStorageModule,
    UploadModule,
    ConversationsModule,
    ProjectModule,
    QuotaModule,
    RedisModule,
    AIModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
