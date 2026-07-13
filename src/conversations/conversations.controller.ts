import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  EditMessageDto,
  PaginationQueryDto,
  PostMessageDto,
  RenameConversationDto,
} from './dto/conversation.dto';

@ApiTags('Conversation')
@ApiBearerAuth('JWT')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: '对话列表（按日期分组，支持 keyword 搜索）' })
  list(
    @CurrentUser() user: JwtPayload,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.list(user.sub, keyword);
  }

  @Post()
  @ApiOperation({ summary: '创建空对话' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateConversationDto,
  ) {
    const conv = await this.service.create(user.sub, dto.title);
    return { id: Number(conv.id), title: conv.title, createdAt: conv.createdAt };
  }

  @Get(':id')
  @ApiOperation({ summary: '对话详情（含消息，分页）' })
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.service.getDetail(user.sub, id, pagination.page, pagination.pageSize);
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名对话' })
  async rename(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameConversationDto,
  ) {
    const conv = await this.service.rename(user.sub, id, dto.title);
    return { id: Number(conv.id), title: conv.title };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除对话' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(user.sub, id);
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
    return this.service.postMessage(user.sub, id, dto);
  }

  @Put(':conversationId/messages/:messageId')
  @ApiOperation({
    summary: '编辑用户消息',
    description:
      '仅允许编辑 role=user 的消息。编辑后删除该消息之后的所有消息，前端重新触发生成。',
  })
  editMessage(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: EditMessageDto,
  ) {
    return this.service.editMessage(user.sub, conversationId, messageId, dto.content);
  }

  @Get(':conversationId/messages/:messageId/versions')
  @ApiOperation({ summary: '获取消息的历史版本列表' })
  getMessageVersions(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.service.getMessageVersions(messageId);
  }

  @Patch(':conversationId/messages/:messageId/versions/:versionId/restore')
  @ApiOperation({ summary: '恢复到指定的历史版本' })
  restoreMessageVersion(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.service.restoreMessageVersion(user.sub, conversationId, messageId, versionId);
  }
}
