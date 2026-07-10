import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
  @ApiOperation({ summary: '对话列表（按日期分组）' })
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.sub);
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
}
