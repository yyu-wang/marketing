import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { PasswordMigrationService } from './auth/password-migration.service';

const GLOBAL_PREFIX = 'api';

const MAX_BOOTSTRAP_RETRIES = 5;
const BOOTSTRAP_RETRY_DELAY_MS = 3000;

async function bootstrap(): Promise<void> {
  let lastError: unknown;
  let app: INestApplication | undefined;

  for (let attempt = 1; attempt <= MAX_BOOTSTRAP_RETRIES; attempt++) {
    try {
      app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
      });
      await startServer(app);
      return;
    } catch (err) {
      lastError = err;
      Logger.error(
        `Bootstrap attempt ${attempt}/${MAX_BOOTSTRAP_RETRIES} failed: ${err instanceof Error ? err.message : String(err)}`,
        'Bootstrap',
      );
      if (app) {
        try { await app.close(); } catch (_) { /* cleanup best-effort */ }
        app = undefined;
      }
      if (attempt < MAX_BOOTSTRAP_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_RETRY_DELAY_MS));
      }
    }
  }

  Logger.error(
    `Bootstrap failed after ${MAX_BOOTSTRAP_RETRIES} attempts`,
    'Bootstrap',
  );
  throw lastError;
}

async function startServer(app: INestApplication): Promise<void> {

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: ['uploads/(.*)'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(reflector),
    new LoggingInterceptor(),
  );

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Marketing Wise API')
      .setDescription(
        'Marketing Wise 智能营销文案助手 后端接口文档（对应 PRD V1.0）。\n' +
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
      .addTag('Conversation', '对话与消息：CRUD / 提交用户消息')
      .addTag('Upload', '图片上传')
      .addTag('AI', 'AI 双版文案生成（SSE）')
      .addTag('Health', '健康检查')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  // 生产部署时自动迁移旧格式密码（幂等，已迁移用户不受影响）
  const migrationService = app.get(PasswordMigrationService);
  await migrationService.migrate();

  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Marketing Wise server is listening on http://localhost:${port}/${GLOBAL_PREFIX}`,
    'Bootstrap',
  );
  if (nodeEnv !== 'production') {
    Logger.log(
      `📖 Swagger docs at  http://localhost:${port}/${GLOBAL_PREFIX}/docs`,
      'Bootstrap',
    );
  }
}

bootstrap().catch((err) => {
  Logger.error('Bootstrap failed:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
