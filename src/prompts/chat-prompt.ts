import { readFile } from 'fs/promises';
import { join } from 'path';
import { ChatMessage } from '../ai-provider/ai-provider.interface';

/**
 * 双版文案 chat prompt
 *
 * 设计要点：
 *   - system 中明确「同时产出小红书 + 朋友圈两版」并固定 JSON schema；
 *   - 用户内容采用 OpenAI 兼容多模态结构：[text, image_url?]；
 *   - 图片优先使用 data URL 喂给视觉模型，避免「Nest 本地 URL 外网不可达」问题，
 *     回退到绝对 URL（PUBLIC_BASE_URL + 相对路径）。
 */
const SYSTEM_PROMPT = `你是一位资深中文营销文案撰写专家。
用户会提供一段创作诉求文本，可能附带一张图片。请你认真观察图片细节
（产品、场景、风格、色调、人物等），结合用户诉求，**同时产出两版文案**：

- 「小红书」版：
  · 200 字以内
  · 风格活泼、富有 emoji、句式短促、有故事感
  · 结尾带 2-4 个 # 话题标签
  · 适合年轻女性用户、易引发互动

- 「朋友圈」版：
  · 120 字以内
  · 自然口语、像朋友推荐、不夸张
  · 含 1-2 个克制的 emoji
  · 不要话题标签

**严格按以下 JSON 输出，前后不要有任何解释、不要套 markdown 代码块：**
{"xiaohongshu":"......","moments":"......"}`;

export interface BuildChatPromptInput {
  text?: string;
  /** 图片相对 URL，如 /uploads/xxx.png */
  imageUrl?: string;
  /** 公网可访问 base，例如 http://localhost:3000 */
  publicBaseUrl?: string;
  /** 是否优先把图片转 data URL（推荐 true，绕开外网回拉问题） */
  preferDataUrl?: boolean;
}

/**
 * 构造 messages 数组
 *
 * 若 preferDataUrl=true 且 imageUrl 是相对 /uploads/...，
 * 会读取本地文件并转 base64 data URL。
 */
export async function buildChatPrompt(
  input: BuildChatPromptInput,
): Promise<ChatMessage[]> {
  const { text, imageUrl, publicBaseUrl, preferDataUrl = true } = input;

  const userParts: any[] = [];

  if (imageUrl) {
    const url = await resolveImageUrl(imageUrl, {
      publicBaseUrl,
      preferDataUrl,
    });
    userParts.push({ type: 'image_url', image_url: { url } });
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
  opts: { publicBaseUrl?: string; preferDataUrl?: boolean },
): Promise<string> {
  // 已是完整 URL 或 data URL：直接用
  if (/^(https?:|data:)/.test(imageUrl)) {
    return imageUrl;
  }

  // 形如 /uploads/xxx.png
  if (opts.preferDataUrl && imageUrl.startsWith('/uploads/')) {
    try {
      const abs = join(process.cwd(), imageUrl.replace(/^\//, ''));
      const buf = await readFile(abs);
      const ext = (imageUrl.split('.').pop() || 'png').toLowerCase();
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      // 文件读不到则退到 URL
    }
  }

  const base = (opts.publicBaseUrl ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return `${base}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

/**
 * 从模型原始输出中解析出 { xiaohongshu, moments }
 *
 * 容错：
 *   1. 直接 JSON.parse；
 *   2. 失败则去除 ```json 包裹后重试；
 *   3. 仍失败则正则提取首个 {...} 子串；
 *   4. 最终失败：整段塞给 xiaohongshu，moments 留空。
 */
export function parseDualOutput(raw: string): {
  xiaohongshu: string;
  moments: string;
} {
  const text = (raw || '').trim();
  const tryParse = (s: string): any | null => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let obj = tryParse(text);
  if (!obj) {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    obj = tryParse(cleaned);
  }
  if (!obj) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) obj = tryParse(m[0]);
  }

  if (obj && typeof obj === 'object') {
    const xhs = String(obj.xiaohongshu ?? obj.xhs ?? '').trim();
    const mom = String(obj.moments ?? obj.pyq ?? obj.wechat ?? '').trim();
    if (xhs || mom) return { xiaohongshu: xhs, moments: mom };
  }

  return { xiaohongshu: text, moments: '' };
}
