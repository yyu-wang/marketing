import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ServeController } from './serve.controller';

/**
 * Upload 模块
 *
 * - POST /api/upload      — 上传图片写入本地磁盘
 * - GET  /uploads/:key    — 通过后端代理读取本地磁盘图片（排除 /api 前缀）
 */
@Module({
  controllers: [UploadController, ServeController],
})
export class UploadModule {}
