import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

/**
 * 应用入口
 *
 * 全局装配：
 *   - 全局前缀 /api，与 PRD 9.1 节路由约定一致；
 *   - 全局 ValidationPipe：开启 whitelist + transform，类型自动转换与字段白名单；
 *   - 全局 HttpExceptionFilter：统一错误响应（PRD 9.3）；
 *   - 全局 ResponseTransformInterceptor：统一成功响应（PRD 9.2）；
 *   - 全局 LoggingInterceptor：请求耗时日志；
 *   - Swagger OpenAPI 文档：/api/docs，方便前后端协作（对应 README 后续工作）；
 *   - CORS：允许前端跨域访问，生产环境请收紧 origin 白名单。
 *
 * 健康检查：GET /api/health
 * API 文档：GET /api/docs
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // 注意：bufferLogs 在 prod 可以接日志收集；这里保留默认控制台输出
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  // 统一 API 前缀
  app.setGlobalPrefix('api');

  // 校验管道：自动转换 + 白名单 + 拒绝未声明字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 异常 / 响应 / 日志
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new LoggingInterceptor(),
  );

  // ---------------------------------------------------------------
  // Swagger / OpenAPI 文档
  //
  // 访问地址：http://localhost:3000/api/docs
  // - 在线 Try it out：开启 Bearer 认证后可直接调试鉴权接口；
  // - JSON 描述文件：/api/docs-json，方便生成前端 SDK。
  //
  // 仅在非生产环境暴露，避免泄漏接口语义。
  // ---------------------------------------------------------------
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CopyWise API')
      .setDescription(
        'CopyWise 智能营销文案助手 后端接口文档（对应 PRD V1.0）。\n' +
          '- 统一响应：{ code, message, data }（PRD 9.2）\n' +
          '- 统一错误：{ code, message, details? }（PRD 9.3）\n' +
          '- 鉴权方式：Authorization: Bearer <JWT>',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '登录后获得的 JWT，置于 Authorization 头部',
        },
        'JWT',
      )
      .addTag('Auth', '认证：注册 / 登录')
      .addTag('Project', '项目：CRUD + 级联')
      .addTag('AI', 'AI 文案生成（SSE）')
      .addTag('Copy', '文案管理：列表 / 编辑 / 收藏 / 删除')
      .addTag('Quota', '额度：今日剩余')
      .addTag('Analytics', '数据看板')
      .addTag('Health', '健康检查')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      // 持久化 Bearer Token，避免每次刷新都要重新粘贴
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // CORS（生产建议收紧 origin / credentials 策略）
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 优雅停机：监听 SIGTERM / SIGINT，避免进程被强杀
  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(
    `🚀 CopyWise server is listening on http://localhost:${port}/api`,
    'Bootstrap',
  );
  if (nodeEnv !== 'production') {
    Logger.log(
      `📖 Swagger docs at  http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

bootstrap().catch((err) => {
  // 启动失败立即退出，便于编排系统重启
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
