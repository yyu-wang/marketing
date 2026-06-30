import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * 图片上传
 *
 * 路由：POST /api/upload
 *
 * 设计：
 *   - 仅接受 image/jpeg|png|webp，限制 5 MB；
 *   - 文件落本地磁盘 `uploads/`（容器内挂载 volume），
 *     由 ServeStaticModule 暴露为 `/uploads/*`；
 *   - 文件名 `${userId}-${uuid}.${ext}`，避免冲突且可溯源用户；
 *   - 返回相对 URL，前端可直接 <img :src> 展示，
 *     喂给视觉模型时由后端拼接 PUBLIC_BASE_URL 转绝对 URL。
 *
 * 注意：当前实现把图片转 data URL 喂给视觉模型作为兜底（见 chat-prompt.ts），
 * 此处 URL 主要用于历史记录回显。
 */
const UPLOAD_DIR = 'uploads';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// 确保目录存在（启动期一次性创建）
const ABS_UPLOAD_DIR = join(process.cwd(), UPLOAD_DIR);
if (!existsSync(ABS_UPLOAD_DIR)) {
  mkdirSync(ABS_UPLOAD_DIR, { recursive: true });
}

@ApiTags('Upload')
@ApiBearerAuth('JWT')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  @Post()
  @ApiOperation({
    summary: '上传图片',
    description:
      '接受 image/jpeg|png|webp，单文件 ≤ 5 MB。返回可静态访问的 URL（相对路径，前端补域名即可）。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: ABS_UPLOAD_DIR,
        filename: (req, file, cb) => {
          const user = (req as any).user as JwtPayload | undefined;
          const userId = user?.sub ?? 'anon';
          const ext = (extname(file.originalname) || '').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
            ? ext
            : '.png';
          cb(null, `${userId}-${uuidv4()}${safeExt}`);
        },
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(
              `不支持的图片格式: ${file.mimetype}，仅允许 jpeg/png/webp`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string; filename: string; size: number; mime: string }> {
    if (!file) {
      throw new BadRequestException('未接收到文件');
    }
    this.logger.log(
      `用户 ${user.sub} 上传图片 ${file.filename} (${file.size} bytes)`,
    );
    return {
      url: `/${UPLOAD_DIR}/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mime: file.mimetype,
    };
  }
}
