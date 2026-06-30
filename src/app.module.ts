import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CopyModule } from './copy/copy.module';
import { RedisModule } from './database/redis.module';
import { createTypeOrmConfig } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { ProjectModule } from './project/project.module';
import { QuotaModule } from './quota/quota.module';

/**
 * 应用根模块
 *
 * 负责全局装配：
 *   - ConfigModule：环境变量加载（全局）；
 *   - TypeOrmModule：数据库连接；
 *   - RedisModule：Redis 单例（@Global）；
 *   - ThrottlerModule：限流（按 IP + 用户），对应 PRD 7.2；
 *   - JwtAuthGuard：全局 JWT 守卫，对应 PRD 4.2.3（默认拦截所有路由，
 *     使用 @Public() 装饰器标记免鉴权接口）。
 *   - 各业务模块。
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
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 60),
        },
      ],
    }),
    RedisModule,
    AuthModule,
    ProjectModule,
    QuotaModule,
    AIModule,
    CopyModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    // 全局 JWT 鉴权（@Public() 可放行）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局限流
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
