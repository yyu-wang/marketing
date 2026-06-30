import { Controller, Query, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map, Observable } from 'rxjs';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { AIService, SseEvent } from './ai.service';
import { GenerateDto } from './dto/generate.dto';

/**
 * AI 文案生成控制器
 *
 * 路由前缀：/api/ai
 * 对应 PRD 9.1：
 *   - GET /api/ai/generate/stream  SSE 流式生成（核心）
 *
 * 备注：浏览器原生 EventSource 不支持自定义请求头，
 * 因此推荐前端通过短期 token 拼到 URL 或使用 fetch + ReadableStream。
 * 本接口仍保留 Bearer Token 校验（前端可使用 cookie 或 fetch SSE 库）。
 */
@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * GET /api/ai/generate/stream
   *
   * @Sse 装饰器自动将 Observable 转换为 SSE 响应：
   *   - Content-Type: text/event-stream
   *   - 每个 next 事件写入一行 "data: ...\n\n"
   * NestJS 期望事件格式为 { data, type?, id?, retry? }，
   * 此处将自定义 SseEvent.event 映射为 type 字段。
   *
   * SSE 事件类型（type 字段）：
   *   - chunk  文案增量片段 { delta }
   *   - copy   单条文案入库完成 { copyId, content, channel }
   *   - done   生成结束 { remaining, max }
   *   - error  异常 { message }
   */
  @Sse('generate/stream')
  @ApiOperation({
    summary: 'SSE 流式生成文案',
    description:
      'PRD 4.4：流式输出文案片段；生成失败不扣额度（PRD 4.4.3）；敏感词命中拒绝保存（PRD 5.4）。',
  })
  generateStream(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GenerateDto,
  ): Observable<{ type: string; data: string }> {
    return this.aiService
      .generateStream(user.sub, dto.projectId, dto.channel)
      .pipe(
        map((evt: SseEvent) => ({
          type: evt.event,
          // SSE data 必须为字符串
          data: JSON.stringify(evt.data),
        })),
      );
  }
}
