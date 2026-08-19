import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';

/**
 * 密码格式迁移服务
 *
 * 在应用启动时自动运行，确保所有用户密码从旧格式 bcrypt(明文)
 * 迁移到新格式 bcrypt(SHA256(明文))。
 *
 * 部署行为：
 *   - Docker 容器启动 → NestJS bootstrap → 本服务执行 → app.listen()
 *   - 幂等：已迁移的用户不会重复处理
 *   - GitHub Actions 部署无需额外步骤
 */
@Injectable()
export class PasswordMigrationService {
  private readonly logger = new Logger(PasswordMigrationService.name);
  private readonly BCRYPT_COST = 12;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * 执行密码格式迁移
   *
   * 1. 确保 password_version 列存在（兼容 DB_SYNC=false 的生产环境）
   * 2. 查找所有旧格式用户（passwordVersion = 0 或 NULL）
   * 3. 重置密码为 {邮箱前缀}123456，使用新格式存储
   */
  async migrate(): Promise<void> {
    await this.ensureColumn();

    const legacyUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.passwordVersion = :ver', { ver: 0 })
      .orWhere('user.passwordVersion IS NULL')
      .getMany();

    if (legacyUsers.length === 0) {
      this.logger.log('All passwords already in SHA-256 format, skipping migration');
      return;
    }

    this.logger.warn(
      `Found ${legacyUsers.length} user(s) with legacy password format. Migrating...`,
    );

    for (const user of legacyUsers) {
      const newPassword = this.makePassword(user.email);
      const sha256Hash = createHash('sha256').update(newPassword).digest('hex');
      user.passwordHash = await hash(sha256Hash, this.BCRYPT_COST);
      user.passwordVersion = 1;
      await this.userRepo.save(user);
      this.logger.log(`  Migrated: ${user.email} → new password: ${newPassword}`);
    }

    this.logger.log(`Password migration complete. ${legacyUsers.length} user(s) migrated.`);
  }

  /**
   * 确保 password_version 列存在
   *
   * 生产环境 DB_SYNC=false 时 TypeORM 不会自动加列，
   * 此处用原生 SQL 兜底，MySQL 的 ADD COLUMN IF NOT EXISTS
   * 在 8.0+ 可用。
   */
  private async ensureColumn(): Promise<void> {
    try {
      await this.userRepo.query(
        `ALTER TABLE users ADD COLUMN password_version TINYINT(1) NOT NULL DEFAULT 0`,
      );
      this.logger.log('Added password_version column to users table');
    } catch (err) {
      // 列已存在时会报错，忽略即可
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('Duplicate column')) {
        this.logger.warn(`ensureColumn warning: ${message}`);
      }
    }
  }

  private makePassword(email: string): string {
    const prefix = email.split('@')[0];
    return prefix + '123456';
  }
}
