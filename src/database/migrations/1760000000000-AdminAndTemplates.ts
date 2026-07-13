import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AdminAndTemplates1760000000000 implements MigrationInterface {
  name = 'AdminAndTemplates1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'varchar',
        length: '20',
        default: "'user'",
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'tinyint',
        width: 1,
        default: 1,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'prompt_templates',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'channel', type: 'varchar', length: '50' },
          { name: 'content', type: 'text' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.query(`
      INSERT INTO prompt_templates (name, channel, content) VALUES
      ('小红书默认模板', 'xiaohongshu', '你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条小红书种草文案，要有吸引眼球的标题与场景化叙述，每条 100-200 字。'),
      ('朋友圈默认模板', 'moments', '你是一位品牌私域运营，擅长写亲切自然、避免过度营销感的朋友圈文案。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条朋友圈文案，语气真实可信，可适度使用 emoji，每条 50-100 字。'),
      ('广告语默认模板', 'ad_slogan', '你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条广告语，要凸显产品独特卖点，每条不超过 20 字。')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'is_active');
    await queryRunner.dropColumn('users', 'role');
    await queryRunner.dropTable('prompt_templates');
  }
}
