import sharp from 'sharp';
import { ChatMessage } from '../ai-provider/ai-provider.interface';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_MIN_BYTES = 500 * 1024;
const TARGET_MAX_BYTES = 2 * 1024 * 1024;

const SYSTEM_PROMPT = `你是一位资深中文营销文案撰写专家。
用户会提供创作诉求，可能附带一张或多张图片。请你根据用户的需求，提供专业、有创意的文案建议。
回答风格自然、专业，像一位经验丰富的营销顾问在与客户交流。
如果用户提供了图片，请仔细观察图片中的细节（产品、场景、风格、色调、人物等），结合这些细节给出建议。`;

export interface BuildChatPromptInput {
  text?: string;
  /** 图片 URL 数组：COS 绝对 URL */
  imageUrls?: string[];
  /** 是否优先把图片转 data URL */
  preferDataUrl?: boolean;
}

export async function buildChatPrompt(
  input: BuildChatPromptInput,
): Promise<ChatMessage[]> {
  const { text, imageUrls, preferDataUrl = true } = input;

  const userParts: any[] = [];

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      const resolved = await resolveImageUrl(url, { preferDataUrl });
      userParts.push({ type: 'image_url', image_url: { url: resolved } });
    }
  }

  userParts.push({
    type: 'text',
    text: (text && text.trim()) || '请根据图片内容生成文案',
  });

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userParts },
  ];
}

async function resolveImageUrl(
  imageUrl: string,
  opts: { preferDataUrl?: boolean },
): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (opts.preferDataUrl) {
    try {
      const resp = await fetch(imageUrl);
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
