import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ProjectEntity } from './entities/project.entity';
import { CopyEntity } from './entities/copy.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

/**
 * TypeORM 配置工厂
 *
 * 设计要点：
 *   - charset/字符集设为 utf8mb4 以支持 emoji 与中文；
 *   - synchronize 仅开发环境启用，生产必须依赖 migration；
 *   - 实体显式声明，便于打包与测试时按需引入。
 *
 * V2 新增：ConversationEntity / MessageEntity（对话式图文创作）。
 * V1 旧实体（Project/Copy）保留以兼容旧数据。
 */
export const createTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST', '127.0.0.1'),
  port: config.get<number>('DB_PORT', 3306),
  username: config.get<string>('DB_USERNAME', 'root'),
  password: config.get<string>('DB_PASSWORD', ''),
  database: config.get<string>('DB_DATABASE', 'marketing_wise'),
  entities: [
    UserEntity,
    ProjectEntity,
    CopyEntity,
    ConversationEntity,
    MessageEntity,
  ],
  synchronize: config.get<string>('DB_SYNC') === 'true',
  logging: config.get<string>('DB_LOGGING') === 'true',
  charset: 'utf8mb4',
  timezone: 'Z',
  extra: {
    connectionLimit: 20,
  },
});
