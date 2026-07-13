import { Controller, ParseIntPipe, Query, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { AIService, SseEvent } from './ai.service';

/**
 * AI 对话生成控制器（V2 chat 模式）
 *
 * 路由前缀：/api/ai
 *
 *   - GET /api/ai/chat/stream?assistantMessageId=xxx
 *     双版文案 SSE 流式生成
 *
 * 鉴权：浏览器原生 EventSource 不支持自定义请求头，
 * JwtStrategy 已对本路由开放 ?token= 兜底。
 */
@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * SSE 事件类型：
   *   - chunk  原始增量片段
   *   - result 结构化两版文案 { xiaohongshu, moments, messageId }
   *   - done   生成结束 + 剩余额度
   *   - error  异常
   */
  @Sse('chat/stream')
  @ApiOperation({
    summary: 'SSE 流式生成双版文案（小红书 + 朋友圈）',
    description:
      '前置：先 POST /api/conversations/:id/messages 落用户消息得到 assistantMessageId，再调用本接口。',
  })
  chatStream(
    @CurrentUser() user: JwtPayload,
    @Query('assistantMessageId', ParseIntPipe) assistantMessageId: number,
    @Query('continueFrom') continueFrom?: string,
    @Query('channel') channel?: string,
    @Query('tone') tone?: string,
    @Query('length') length?: string,
  ): Observable<{ type: string; data: string }> {
    return this.aiService
      .generateChat(user.sub, assistantMessageId, { continueFrom, channel, tone, length })
      .pipe(
      map((evt: SseEvent) => ({
        type: evt.event,
        data: JSON.stringify(evt.data),
      })),
    );
  }
}
