import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { basename, extname, join, resolve } from 'path';

const DEFAULT_UPLOAD_DIR = './uploads';

/**
 * 本地磁盘存储服务。
 *
 * 提供 upload/getObject/delete/buildUrl 对象存储风格接口，
 * 便于将来切换回云端对象存储时无需改动 Controller 层。
 */
@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>(
      'UPLOAD_DIR',
      DEFAULT_UPLOAD_DIR,
    );
  }

  async onModuleInit() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    this.logger.log(
      `本地存储已初始化，目录: ${resolve(this.uploadDir)}`,
    );
  }

  isAvailable(): boolean {
    return true;
  }

  async upload(
    key: string,
    body: Buffer,
    _contentType: string,
  ): Promise<{ url: string; key: string }> {
    await fs.writeFile(join(this.uploadDir, key), body);
    this.logger.log(`本地上传成功: ${key} (${body.length} bytes)`);
    return { url: this.buildUrl(key), key };
  }

  buildUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    const filePath = this.resolveSafePath(key);
    const body = await fs.readFile(filePath);
    const ext = extname(filePath).replace(/^\./, '').toLowerCase();
    return {
      body,
      contentType: getMime(ext),
    };
  }

  /**
   * 白名单校验：仅取文件名部分，杜绝路径穿越（../、绝对路径等）读取任意文件。
   */
  private resolveSafePath(key: string): string {
    return join(this.uploadDir, basename(key));
  }
}

function getMime(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream';
}
