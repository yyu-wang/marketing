import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionsConfig,
  ChatCompletionsProvider,
} from './chat-completions.provider';

const DEEPSEEK_CONFIG: ChatCompletionsConfig = {
  name: 'deepseek',
  defaultBaseUrl: 'https://api.deepseek.com',
  defaultTextModel: 'deepseek-flash',
};

/**
 * DeepSeek Provider
 *
 * 通过 DeepSeek OpenAI 兼容接口实现 SSE 流式生成。
 * 文档：https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
 *
 * 两点与通义千问不同：
 *   - deepseek-flash 同时支持文本与图片输入，无需单独配置视觉模型，
 *     AI_VISION_MODEL 缺省沿用 AI_MODEL；
 *   - DeepSeek 默认开启 thinking（先输出思维链再输出正文），会明显推迟
 *     首字、容易触发上层 AI_TIMEOUT_MS 熔断，故对文案场景显式关闭。
 */
@Injectable()
export class DeepSeekProvider extends ChatCompletionsProvider {
  constructor(config: ConfigService) {
    super(config, DEEPSEEK_CONFIG);
  }

  /** 域名 / 已带 /v1 的 base 均补 /chat/completions；已带则原样使用 */
  protected resolveEndpoint(baseUrl: string): string {
    const base = baseUrl.replace(/\/+$/, '');
    return /\/chat\/completions$/.test(base)
      ? base
      : `${base}/chat/completions`;
  }

  protected extraRequestBody(): Record<string, unknown> {
    return { thinking: { type: 'disabled' } };
  }
}
