import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { CopyEntity } from './entities/copy.entity';
import { ProjectEntity } from './entities/project.entity';
import { QuotaRecordEntity } from './entities/quota-record.entity';
import { UserEntity } from './entities/user.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'copywise',
  entities: [
    UserEntity,
    ProjectEntity,
    CopyEntity,
    QuotaRecordEntity,
    ConversationEntity,
    MessageEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  charset: 'utf8mb4',
});
