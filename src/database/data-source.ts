import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { CopyEntity } from './entities/copy.entity';
import { ProjectEntity } from './entities/project.entity';
import { QuotaRecordEntity } from './entities/quota-record.entity';
import { UserEntity } from './entities/user.entity';

/**
 * TypeORM 数据源（独立于 NestJS Runtime）
 *
 * 用途：供 typeorm CLI 生成 / 执行 migration 使用：
 *   - npm run migration:generate src/database/migrations/Init
 *   - npm run migration:run
 *
 * 注意：生产环境必须基于 migration 修改 DB schema，禁用 synchronize。
 */
dotenv.config({ path: process.env.ENV_FILE || '.env' });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'copywise',
  entities: [UserEntity, ProjectEntity, CopyEntity, QuotaRecordEntity],
  migrations: ['src/database/migrations/*.ts'],
  charset: 'utf8mb4',
});
