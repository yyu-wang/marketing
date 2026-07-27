import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ServeController } from './serve.controller';

/**
 * Upload 模块
 *
 * - POST /api/upload      — 上传图片到 COS
 * - GET  /uploads/:key    — 通过后端代理访问 COS 图片（排除 /api 前缀）
 */
@Module({
  controllers: [UploadController, ServeController],
})
export class UploadModule {}
