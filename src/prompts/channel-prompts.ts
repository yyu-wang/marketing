import { CopyChannel } from '../database/entities/copy.entity';

/**
 * Prompt 模板上下文
 *
 * 由 AIService 拼装传入。
 */
export interface PromptContext {
  productName: string;
  productDesc: string;
  targetAudience?: string | null;
}

/**
 * 渠道 Prompt 模板配置
 *
 * 对应 PRD 4.4.2 Prompt 构建规则。
 * 新增渠道时仅需在此追加一项即可（满足 PRD 7.4 可扩展性）。
 */
export interface ChannelPromptConfig {
  /** 渠道枚举 */
  channel: CopyChannel;
  /** 角色定位 */
  role: string;
  /** 输出要求 */
  requirement: string;
  /** 每条字数提示 */
  lengthHint: string;
}

export const CHANNEL_PROMPTS: Record<CopyChannel, ChannelPromptConfig> = {
  [CopyChannel.XIAOHONGSHU]: {
    channel: CopyChannel.XIAOHONGSHU,
    role: '你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草',
    requirement: '生成 3 条小红书种草文案，要有吸引眼球的标题与场景化叙述',
    lengthHint: '每条 100-200 字',
  },
  [CopyChannel.MOMENTS]: {
    channel: CopyChannel.MOMENTS,
    role: '你是一位品牌私域运营，擅长写亲切自然、避免过度营销感的朋友圈文案',
    requirement: '生成 3 条朋友圈文案，语气真实可信，可适度使用 emoji',
    lengthHint: '每条 50-100 字',
  },
  [CopyChannel.AD_SLOGAN]: {
    channel: CopyChannel.AD_SLOGAN,
    role: '你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语',
    requirement: '生成 3 条广告语，要凸显产品独特卖点',
    lengthHint: '每条不超过 20 字',
  },
};

/**
 * 拼装最终 Prompt
 *
 * 输出格式硬性要求 JSON 数组，便于后端结构化解析；
 * 若模型不遵守，后端会兜底按行/段落切分（见 AIService.parseCopies）。
 */
export function buildPrompt(channel: CopyChannel, ctx: PromptContext): string {
  const cfg = CHANNEL_PROMPTS[channel];
  const audience = ctx.targetAudience
    ? `目标人群：${ctx.targetAudience}\n`
    : '';

  return [
    `${cfg.role}。`,
    `请基于以下产品信息撰写文案：`,
    `产品名称：${ctx.productName}`,
    `产品描述：${ctx.productDesc}`,
    audience,
    `要求：${cfg.requirement}，${cfg.lengthHint}。`,
    `输出必须严格为 JSON 数组（不要任何额外说明），形如：["文案1", "文案2", "文案3"]`,
  ]
    .filter(Boolean)
    .join('\n');
}
