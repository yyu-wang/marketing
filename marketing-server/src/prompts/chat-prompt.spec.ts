import { buildChatPrompt } from './chat-prompt';

describe('buildChatPrompt 渠道系统提示词', () => {
  it('传入 channelSystemPrompt 时使用后台模板作为 system 内容', async () => {
    const template = '你是一位定制化的小红书文案专家。';
    const messages = await buildChatPrompt({
      text: '写一条产品文案',
      channel: 'xiaohongshu',
      channelSystemPrompt: template,
    });

    expect(messages[0]).toEqual({ role: 'system', content: template });
  });

  it('未传入 channelSystemPrompt 时回退内置渠道 prompt', async () => {
    const messages = await buildChatPrompt({
      text: '写一条产品文案',
      channel: 'moments',
    });

    const system = messages[0];
    expect(system.role).toBe('system');
    expect((system.content as string)).toContain('朋友圈');
    expect((system.content as string)).toContain('避免过度营销感');
  });

  it('后台模板基础上追加 tone/length 约束', async () => {
    const template = '你是一位定制化的广告文案专家。';
    const messages = await buildChatPrompt({
      text: '写一条广告语',
      channel: 'ad_slogan',
      channelSystemPrompt: template,
      tone: 'professional',
      length: 'short',
    });

    const system = messages[0].content as string;
    expect(system.startsWith(template)).toBe(true);
    expect(system).toContain('专业、正式的语气');
    expect(system).toContain('回复尽量简短精炼');
  });

  it('无 channel 且无模板时使用通用默认 prompt', async () => {
    const messages = await buildChatPrompt({ text: '帮我写文案' });

    const system = messages[0].content as string;
    expect(system).toContain('资深中文营销文案撰写专家');
  });
});
