import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionsConfig,
  ChatCompletionsProvider,
} from './chat-completions.provider';

const QWEN_CONFIG: ChatCompletionsConfig = {
  name: 'qwen',
  defaultBaseUrl: 'https://dashscope.aliyuncs.com',
  defaultTextModel: 'qwen-turbo',
};

/**
 * 通义千问 Provider
 *
 * 通过 DashScope OpenAI 兼容接口实现 SSE 流式生成。
 * 文档：https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 *
 * 含图片时由基类自动切换到 AI_VISION_MODEL（如 qwen-vl-max-latest）。
 */
@Injectable()
export class QwenProvider extends ChatCompletionsProvider {
  constructor(config: ConfigService) {
    super(config, QWEN_CONFIG);
  }

  /**
   * 兼容多种 AI_BASE_URL 配置：
   *   - 完整 endpoint（已带 /chat/completions）：直接用
   *   - 已带 /v1 或 /compatible-mode/v1：补 /chat/completions
   *   - 仅域名：补 /compatible-mode/v1/chat/completions
   */
  protected resolveEndpoint(baseUrl: string): string {
    const base = baseUrl.replace(/\/+$/, '');
    if (/\/chat\/completions$/.test(base)) return base;
    if (/\/v1$/.test(base)) return `${base}/chat/completions`;
    return `${base}/compatible-mode/v1/chat/completions`;
  }
}
