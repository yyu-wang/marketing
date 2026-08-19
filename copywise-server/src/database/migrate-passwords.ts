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

function makePassword(email: string): string {
  const prefix = email.split('@')[0];
  return prefix + '123456';
}

async function migrate() {
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
  console.log('Connected to DB\n');

  const repo = ds.getRepository(UserEntity);
  const users = await repo.find();

  if (users.length === 0) {
    console.log('No users found. Nothing to migrate.');
    await ds.destroy();
    return;
  }

  console.log(`Found ${users.length} user(s). Migrating passwords to bcrypt(SHA256) format...\n`);

  for (const user of users) {
    const newPlainPassword = makePassword(user.email);
    const sha256Hash = createHash('sha256').update(newPlainPassword).digest('hex');
    user.passwordHash = hashSync(sha256Hash, 12);
    user.passwordVersion = 1;
    await repo.save(user);
    console.log(`  ${user.email} → 新密码: ${newPlainPassword}`);
  }

  console.log(`\nAll ${users.length} user(s) migrated successfully.`);
  console.log('Please inform users of their new passwords.');

  await ds.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
