import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from './ai-provider.interface';
import { DeepSeekProvider } from './deepseek.provider';
import { QwenProvider } from './qwen.provider';

/**
 * AI Provider 模块
 *
 * 设计：根据 AI_PROVIDER 环境变量动态选择具体实现。
 * 当前内置：qwen（通义千问）/ deepseek（DeepSeek）。后续新增供应商在此扩展即可。
 *
 * 暴露：
 *   - AI_PROVIDER 注入 Token（按接口而非实现编程，便于替换）。
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('AI_PROVIDER', 'qwen');
        switch (provider) {
          case 'qwen':
            return new QwenProvider(config);
          case 'deepseek':
            return new DeepSeekProvider(config);
          default:
            throw new Error(`不支持的 AI Provider: ${provider}`);
        }
      },
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIProviderModule {}
