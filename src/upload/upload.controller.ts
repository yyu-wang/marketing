import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
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
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CosService } from '../cos/cos.service';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@ApiTags('Upload')
@ApiBearerAuth('JWT')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly cosService: CosService) {}

  @Post()
  @ApiOperation({
    summary: '上传图片',
    description:
      '接受 image/jpeg|png|webp，上传到腾讯云 COS。返回公网可访问的 URL。',
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
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
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

    const userId = user.sub;
    const ext = extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
      ? ext
      : '.png';
    const filename = `${userId}-${uuidv4()}${safeExt}`;

    if (!this.cosService.isAvailable()) {
      throw new InternalServerErrorException(
        'COS 对象存储服务不可用，请稍后重试',
      );
    }

    const result = await this.cosService.upload(
      filename,
      file.buffer,
      file.mimetype,
    );
    this.logger.log(
      `用户 ${userId} 上传图片到 COS: ${filename} (${file.size} bytes)`,
    );
    return {
      url: result.url,
      filename,
      size: file.size,
      mime: file.mimetype,
    };
  }
}
