import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ProjectEntity } from './entities/project.entity';
import { CopyEntity } from './entities/copy.entity';
import { QuotaRecordEntity } from './entities/quota-record.entity';

/**
 * TypeORM 配置工厂
 *
 * 设计要点：
 *   - charset/字符集设为 utf8mb4 以支持 emoji 与中文（PRD 8.1）；
 *   - synchronize 仅开发环境启用，生产必须依赖 migration；
 *   - 实体显式声明，便于打包与测试时按需引入。
 */
export const createTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST', '127.0.0.1'),
  port: config.get<number>('DB_PORT', 3306),
  username: config.get<string>('DB_USERNAME', 'root'),
  password: config.get<string>('DB_PASSWORD', ''),
  database: config.get<string>('DB_DATABASE', 'copywise'),
  entities: [UserEntity, ProjectEntity, CopyEntity, QuotaRecordEntity],
  // 自动建表仅限开发，生产请使用迁移
  synchronize: config.get<string>('DB_SYNC') === 'true',
  logging: config.get<string>('DB_LOGGING') === 'true',
  charset: 'utf8mb4',
  timezone: 'Z', // 数据库以 UTC 存储；业务层在需要时按 Asia/Shanghai 转换
  extra: {
    connectionLimit: 20,
  },
});
