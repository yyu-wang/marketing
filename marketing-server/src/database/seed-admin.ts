import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env' });

import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { PromptTemplateEntity } from './entities/prompt-template.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { CopyEntity } from './entities/copy.entity';
import { ProjectEntity } from './entities/project.entity';
import { hashSync } from 'bcryptjs';
import { createHash } from 'crypto';

async function seed() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'copywise',
    entities: [UserEntity, PromptTemplateEntity, ConversationEntity, MessageEntity, CopyEntity, ProjectEntity],
  });

  await ds.initialize();
  console.log('Connected to DB');

  const existing = await ds.getRepository(UserEntity).findOne({ where: { email: 'admin@copywise.com' } });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    await ds.destroy();
    return;
  }

  const repo = ds.getRepository(UserEntity);
  const admin = repo.create({
    email: 'admin@copywise.com',
    passwordHash: hashSync(createHash('sha256').update('admin123456').digest('hex'), 12),
    passwordVersion: 1,
    role: 'admin',
    isActive: 1,
  });
  await repo.save(admin);
  console.log('Admin user created: admin@copywise.com / admin123456');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
