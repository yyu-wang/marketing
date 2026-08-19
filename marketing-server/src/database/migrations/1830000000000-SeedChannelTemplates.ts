import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_TEMPLATES = [
  {
    name: '小红书默认模板',
    channel: 'xiaohongshu',
    content: `你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草。
用户会提供创作诉求，请根据需求生成小红书风格的种草文案。
回答风格活泼亲切，使用 emoji 和网络热词，注重场景化和互动感。`,
  },
  {
    name: '朋友圈默认模板',
    channel: 'moments',
    content: `你是一位品牌私域运营专家，擅长写亲切自然、真实可信的朋友圈文案。
用户会提供创作诉求，请根据需求生成朋友圈风格的文案。
回答风格亲切真实，避免过度营销感，像朋友分享一样自然。`,
  },
  {
    name: '广告语默认模板',
    channel: 'ad_slogan',
    content: `你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语。
用户会提供创作诉求，请根据需求生成广告语。
回答简洁有力，凸显产品独特卖点，朗朗上口。`,
  },
];

/**
 * 幂等补齐渠道默认模板
 *
 * 176 号迁移种子的模板行可能被 DB_SYNC（synchronize 重建表）清空，导致后台模板列表为空。
 * 该迁移仅在对应 channel 缺失时插入 chat 适用的角色提示词，保证开箱即用。
 */
export class SeedChannelTemplates1830000000000 implements MigrationInterface {
  name = 'SeedChannelTemplates1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { name, channel, content } of DEFAULT_TEMPLATES) {
      await queryRunner.query(
        `INSERT INTO prompt_templates (name, channel, content)
         SELECT ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM prompt_templates WHERE channel = ?)`,
        [name, channel, content, channel],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { channel } of DEFAULT_TEMPLATES) {
      await queryRunner.query(
        'DELETE FROM prompt_templates WHERE channel = ?',
        [channel],
      );
    }
  }
}
