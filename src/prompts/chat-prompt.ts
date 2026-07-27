import sharp from 'sharp';
import { ChatMessage } from '../ai-provider/ai-provider.interface';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_MIN_BYTES = 500 * 1024;
const TARGET_MAX_BYTES = 2 * 1024 * 1024;

const CHANNEL_SYSTEM_PROMPTS: Record<string, string> = {
  xiaohongshu: `你是一位小红书爆款文案写手，擅长使用 emoji、口语化表达和网络热词种草。
用户会提供创作诉求，请根据需求生成小红书风格的种草文案。
回答风格活泼亲切，使用 emoji 和网络热词，注重场景化和互动感。`,
  moments: `你是一位品牌私域运营专家，擅长写亲切自然、真实可信的朋友圈文案。
用户会提供创作诉求，请根据需求生成朋友圈风格的文案。
回答风格亲切真实，避免过度营销感，像朋友分享一样自然。`,
  ad_slogan: `你是一位资深广告 Copywriter，擅长创作简短有力、便于记忆的广告语。
用户会提供创作诉求，请根据需求生成广告语。
回答简洁有力，凸显产品独特卖点，朗朗上口。`,
};

const TONE_PROMPTS: Record<string, string> = {
  professional: '使用专业、正式的语气，适合商务场景。',
  lively: '使用轻松、活泼的语气，有亲和力和趣味性。',
  literary: '使用文艺、优雅的语气，有诗意的表达。',
};

const LENGTH_PROMPTS: Record<string, string> = {
  short: '回复尽量简短精炼。',
  medium: '回复长度适中。',
  long: '回复可以详细展开。',
};

function buildSystemPrompt(channel?: string, tone?: string, length?: string): string {
  const basePrompt = channel && CHANNEL_SYSTEM_PROMPTS[channel]
    ? CHANNEL_SYSTEM_PROMPTS[channel]
    : `你是一位资深中文营销文案撰写专家。
用户会提供创作诉求，可能附带一张或多张图片。请你根据用户的需求，提供专业、有创意的文案建议。
回答风格自然、专业，像一位经验丰富的营销顾问在与客户交流。
如果用户提供了图片，请仔细观察图片中的细节（产品、场景、风格、色调、人物等），结合这些细节给出建议。`;

  const extras: string[] = [];
  if (tone && TONE_PROMPTS[tone]) extras.push(TONE_PROMPTS[tone]);
  if (length && LENGTH_PROMPTS[length]) extras.push(LENGTH_PROMPTS[length]);

  if (extras.length > 0) {
    return `${basePrompt}\n\n${extras.join('\n')}`;
  }
  return basePrompt;
}

export interface BuildChatPromptInput {
  text?: string;
  imageUrls?: string[];
  preferDataUrl?: boolean;
  continueFrom?: string;
  channel?: string;
  tone?: string;
  length?: string;
  /** 后端自身可访问的基地址，用于将 /uploads/xxx 相对路径转为绝对 URL */
  baseUrl?: string;
}

export async function buildChatPrompt(
  input: BuildChatPromptInput,
): Promise<ChatMessage[]> {
  const { text, imageUrls, preferDataUrl = true, continueFrom, channel, tone, length, baseUrl } = input;

  const userParts: any[] = [];

  if (imageUrls && imageUrls.length > 0) {
    const resolvedUrls = await Promise.all(
      imageUrls.map((url) => resolveImageUrl(url, { preferDataUrl, baseUrl })),
    );
    for (const resolved of resolvedUrls) {
      userParts.push({ type: 'image_url', image_url: { url: resolved } });
    }
  }

  userParts.push({
    type: 'text',
    text: (text && text.trim()) || '请根据图片内容生成文案',
  });

  const systemPrompt = buildSystemPrompt(channel, tone, length);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userParts },
  ];

  if (continueFrom) {
    messages.push({ role: 'assistant', content: continueFrom });
  }

  return messages;
}

async function resolveImageUrl(
  imageUrl: string,
  opts: { preferDataUrl?: boolean; baseUrl?: string },
): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // 相对路径（如 /uploads/xxx.jpg）需要补全为绝对 URL 才能被服务端 fetch 下载
  const absoluteUrl = imageUrl.startsWith('/') && opts.baseUrl
    ? `${opts.baseUrl.replace(/\/$/, '')}${imageUrl}`
    : imageUrl;

  if (opts.preferDataUrl) {
    try {
      const resp = await fetch(absoluteUrl);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const rawBuf = Buffer.from(await resp.arrayBuffer());

      if (rawBuf.length <= TARGET_MAX_BYTES) {
        const ext = (imageUrl.split('.').pop() || 'png').toLowerCase();
        const mime = getMime(ext);
        return `data:${mime};base64,${rawBuf.toString('base64')}`;
      }

      const compressedBuf = await compressImage(rawBuf);
      return `data:image/jpeg;base64,${compressedBuf.toString('base64')}`;
    } catch {
      // 下载/转换失败则直接使用原始 URL
    }
  }

  return imageUrl;
}

function getMime(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

async function compressImage(buf: Buffer): Promise<Buffer> {
  const image = sharp(buf);
  const meta = await image.metadata();

  let width = meta.width ?? 1920;
  let height = meta.height ?? 1080;

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  let quality = 80;
  let compressedBuf = await image.clone().resize(width, height).jpeg({ quality }).toBuffer();

  if (compressedBuf.length > TARGET_MAX_BYTES) {
    while (quality > 20 && compressedBuf.length > TARGET_MAX_BYTES) {
      quality -= 10;
      compressedBuf = await image.clone().resize(width, height).jpeg({ quality }).toBuffer();
    }
  }

  if (compressedBuf.length < TARGET_MIN_BYTES && quality < 100) {
    while (quality < 100 && compressedBuf.length < TARGET_MIN_BYTES) {
      quality += 5;
      compressedBuf = await image.clone().resize(width, height).jpeg({ quality }).toBuffer();
    }
  }

  return compressedBuf;
}
