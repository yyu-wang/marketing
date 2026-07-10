import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';

@Injectable()
export class CosService implements OnModuleInit {
  private readonly logger = new Logger(CosService.name);
  private cos: COS | null = null;
  private bucket: string;
  private region: string;
  private cdnDomain: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('COS_BUCKET', '');
    this.region = config.get<string>('COS_REGION', 'ap-guangzhou');
    this.cdnDomain = config.get<string>('COS_CDN_DOMAIN', '');
  }

  async onModuleInit() {
    const secretId = this.config.get<string>('COS_SECRET_ID');
    const secretKey = this.config.get<string>('COS_SECRET_KEY');

    if (!secretId || !secretKey || !this.bucket) {
      this.logger.warn(
        'COS 配置不完整（COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET），图片上传将回退到本地存储',
      );
      return;
    }

    this.cos = new COS({ SecretId: secretId, SecretKey: secretKey });
    this.logger.log(`COS 客户端已初始化，Bucket: ${this.bucket}, Region: ${this.region}`);

    // 启动时校验连通性
    try {
      await this.cos.headBucket({ Bucket: this.bucket, Region: this.region });
      this.logger.log(`COS 桶连通性校验通过: ${this.bucket}`);
    } catch (err: any) {
      this.logger.error(
        `COS 桶连通失败（${err?.statusCode ?? err?.message ?? err}），请检查 Bucket/Region/密钥`,
      );
      this.cos = null;
    }
  }

  isAvailable(): boolean {
    return this.cos !== null;
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    if (!this.cos) {
      throw new Error('COS 客户端未初始化');
    }

    try {
      await this.cos.putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
      });
    } catch (err: any) {
      this.logger.error(`COS 上传失败: ${err?.message ?? err}`);
      throw err;
    }

    const url = this.buildUrl(key);
    this.logger.log(`COS 上传成功: ${key} → ${url}`);
    return { url, key };
  }

  buildUrl(key: string): string {
    if (this.cdnDomain) {
      const base = this.cdnDomain.replace(/\/$/, '');
      return `${base}/${key}`;
    }
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    if (!this.cos) return;
    try {
      await this.cos.deleteObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
      });
    } catch (err: any) {
      this.logger.error(`COS 删除失败: ${key}`, err?.message ?? err);
      throw err;
    }
  }
}
