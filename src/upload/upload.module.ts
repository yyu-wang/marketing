import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

/**
 * Upload 模块
 *
 * 仅暴露 POST /api/upload 接口；静态文件托管由 app.module 中的
 * ServeStaticModule 完成。
 */
@Module({
  controllers: [UploadController],
})
export class UploadModule {}
