import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AIModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ConversationsModule } from './conversations/conversations.module';
import { RedisModule } from './database/redis.module';
import { createTypeOrmConfig } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { QuotaModule } from './quota/quota.module';
import { UploadModule } from './upload/upload.module';

/**
 * 应用根模块（V2：对话式图文创作）
 *
 * 全局装配：
 *   - ConfigModule：环境变量加载（全局）；
 *   - TypeOrmModule：数据库连接；
 *   - RedisModule：Redis 单例（@Global）；
 *   - ServeStaticModule：托管上传的图片 `uploads/`；
 *   - ThrottlerModule：限流（按 IP）；
 *   - JwtAuthGuard：全局 JWT 守卫（@Public() 例外）。
 *
 * V2 业务模块：
 *   - UploadModule        图片上传
 *   - ConversationsModule 对话 / 消息 CRUD
 *   - AIModule            双版文案 SSE 生成
 *
 * V1 旧模块（Project / Copy / Analytics）已退役，代码暂保留但不再装载。
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
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: true,
        maxAge: '7d',
      },
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
    QuotaModule,
    UploadModule,
    ConversationsModule,
    AIModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
