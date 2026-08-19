import { Controller, Get, Logger, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';

/**
 * 图片代理服务 — 从本地磁盘读取图片返回。
 *
 * 路由: GET /uploads/:key （排除 /api 全局前缀，无需认证）
 */
@Public()
@Controller('uploads')
export class ServeController {
  private readonly logger = new Logger(ServeController.name);

  constructor(private readonly localStorageService: LocalStorageService) {}

  @Get(':key')
  @RawResponse()
  async serve(@Param('key') key: string, @Res() res: Response): Promise<void> {
    try {
      const { body, contentType } = await this.localStorageService.getObject(key);
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      });
      res.send(body);
    } catch (err: any) {
      this.logger.warn(`图片代理失败 key=${key}: ${err?.message ?? err}`);
      if (err?.code === 'ENOENT') {
        throw new NotFoundException('图片不存在');
      }
      throw err;
    }
  }
}
