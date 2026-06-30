import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  PostMessageDto,
  RenameConversationDto,
} from './dto/conversation.dto';

/**
 * 对话 / 消息 控制器
 *
 * 路由前缀：/api/conversations
 *
 * 路由清单：
 *   - GET    /api/conversations              侧边栏列表（按日期分组）
 *   - POST   /api/conversations              创建空对话
 *   - GET    /api/conversations/:id          对话详情（含全部 messages）
 *   - PATCH  /api/conversations/:id          重命名
 *   - DELETE /api/conversations/:id          删除（级联 messages）
 *   - POST   /api/conversations/:id/messages 落 user 消息 + assistant 占位，
 *                                            返回 { userMessageId, assistantMessageId }
 *                                            前端拿 assistantMessageId 调 SSE 端点
 */
@ApiTags('Conversation')
@ApiBearerAuth('JWT')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: '对话列表（按日期分组）' })
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.list(user.sub);
  }

  @Post()
  @ApiOperation({ summary: '创建空对话' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateConversationDto,
  ) {
    const conv = await this.svc.create(user.sub, dto.title);
    return { id: Number(conv.id), title: conv.title, createdAt: conv.createdAt };
  }

  @Get(':id')
  @ApiOperation({ summary: '对话详情（含全部消息）' })
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.getDetail(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名对话' })
  async rename(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameConversationDto,
  ) {
    const conv = await this.svc.rename(user.sub, id, dto.title);
    return { id: Number(conv.id), title: conv.title };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除对话' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.svc.remove(user.sub, id);
    return { id };
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: '提交一条用户消息',
    description:
      '落 user 消息 + 创建 assistant 占位（pending）。前端拿 assistantMessageId 调用 /api/ai/chat/stream 完成流式生成。',
  })
  postMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostMessageDto,
  ) {
    return this.svc.postMessage(user.sub, id, dto);
  }
}
