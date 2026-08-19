import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class AddSensitiveWords1790000000000 implements MigrationInterface {
  name = 'AddSensitiveWords1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sensitive_words',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'word',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '敏感词',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            default: "'general'",
            isNullable: false,
            comment: '分类标签',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: '是否启用',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sensitive_words', true);
  }
}
