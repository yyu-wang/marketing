import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 客户端注入 Token
 *
 * 使用方式：在需要 Redis 的 Service 构造函数中
 *   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * 全局 Redis 模块
 *
 * 作用：维护单例 ioredis 连接，供额度管理、限流、SSE 会话等模块共享。
 * 注意：
 *   - 使用 ioredis 以支持 Lua 脚本与 EVAL，是额度并发安全的关键依赖（PRD 4.4.4）；
 *   - 通过 @Global() 暴露，业务模块无需重复 import。
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const client = new Redis({
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
          // 自动重连：网络抖动时维持服务可用
          retryStrategy: (times) => Math.min(times * 200, 2000),
          maxRetriesPerRequest: 3,
        });

        client.on('error', (err) => {
          // 仅打印一次，避免日志风暴；详细信息由监控系统接管
          // eslint-disable-next-line no-console
          console.error('[Redis] connection error:', err.message);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
