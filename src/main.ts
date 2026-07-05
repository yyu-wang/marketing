import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

const GLOBAL_PREFIX = 'api';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  app.setGlobalPrefix(GLOBAL_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new LoggingInterceptor(),
  );

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
      .addTag('Conversation', '对话与消息：CRUD / 提交用户消息')
      .addTag('Upload', '图片上传')
      .addTag('AI', 'AI 双版文案生成（SSE）')
      .addTag('Quota', '额度：今日剩余')
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

  await app.listen(port);
  Logger.log(
    `🚀 CopyWise server is listening on http://localhost:${port}/${GLOBAL_PREFIX}`,
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
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
