import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 更新种子渠道模板内容
 *
 * 176 号迁移种子的模板是「产品信息」格式（含 {productName} 等占位符），
 * 服务于已废弃的 buildPrompt 批量生成流程；chat/stream 走的是 role 式系统提示词。
 * 该迁移把 3 条渠道模板改为 chat 适用的角色提示词，与 chat-prompt.ts 内置兜底保持一致。
 */
export class UpdateChannelTemplateContent1820000000000 implements MigrationInterface {
  name = 'UpdateChannelTemplateContent1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const templates = [
      {
        channel: 'xiaohongshu',
        content: `你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草。
用户会提供创作诉求，请根据需求生成小红书风格的种草文案。
回答风格活泼亲切，使用 emoji 和网络热词，注重场景化和互动感。`,
      },
      {
        channel: 'moments',
        content: `你是一位品牌私域运营专家，擅长写亲切自然、真实可信的朋友圈文案。
用户会提供创作诉求，请根据需求生成朋友圈风格的文案。
回答风格亲切真实，避免过度营销感，像朋友分享一样自然。`,
      },
      {
        channel: 'ad_slogan',
        content: `你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语。
用户会提供创作诉求，请根据需求生成广告语。
回答简洁有力，凸显产品独特卖点，朗朗上口。`,
      },
    ];

    for (const { channel, content } of templates) {
      await queryRunner.query(
        'UPDATE prompt_templates SET content = ? WHERE channel = ?',
        [content, channel],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const original = [
      {
        channel: 'xiaohongshu',
        content: '你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条小红书种草文案，要有吸引眼球的标题与场景化叙述，每条 100-200 字。',
      },
      {
        channel: 'moments',
        content: '你是一位品牌私域运营，擅长写亲切自然、避免过度营销感的朋友圈文案。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条朋友圈文案，语气真实可信，可适度使用 emoji，每条 50-100 字。',
      },
      {
        channel: 'ad_slogan',
        content: '你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语。\\n请基于以下产品信息撰写文案：\\n产品名称：{productName}\\n产品描述：{productDesc}\\n{targetAudience}\\n要求：生成 3 条广告语，要凸显产品独特卖点，每条不超过 20 字。',
      },
    ];

    for (const { channel, content } of original) {
      await queryRunner.query(
        'UPDATE prompt_templates SET content = ? WHERE channel = ?',
        [content, channel],
      );
    }
  }
}
