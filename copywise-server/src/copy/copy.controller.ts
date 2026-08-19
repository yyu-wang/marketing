import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CopyService } from './copy.service';
import {
  BatchDeleteDto,
  CreateFromMessageDto,
  ListCopiesQueryDto,
  ToggleStarDto,
  UpdateCopyDto,
} from './dto/copy.dto';

@ApiTags('Copy')
@ApiBearerAuth('JWT')
@Controller()
export class CopyController {
  constructor(private readonly copyService: CopyService) {}

  @Get('projects/:projectId/copies')
  @ApiOperation({
    summary: '项目下文案列表（支持渠道筛选 + 排序）',
    description: 'PRD 4.5.1：默认按生成时间倒序；可通过 channel 过滤。',
  })
  @ApiParam({ name: 'projectId', description: '项目 ID', example: 1 })
  list(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: ListCopiesQueryDto,
  ) {
    return this.copyService.listByProject(
      user.sub,
      projectId,
      query.channel,
      query.order ?? 'desc',
    );
  }

  @Post('copies/from-message')
  @ApiOperation({ summary: '从对话消息保存文案到项目' })
  createFromMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFromMessageDto,
  ) {
    return this.copyService.createFromMessage(user.sub, dto.messageId, dto.projectId, dto.channel);
  }

  @Put('copies/:id')
  @ApiOperation({ summary: '编辑文案（标记 is_edited）' })
  @ApiParam({ name: 'id', description: '文案 ID', example: 100 })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCopyDto,
  ) {
    return this.copyService.update(user.sub, id, dto);
  }

  @Patch('copies/:id/star')
  @ApiOperation({
    summary: '切换/设置收藏状态',
    description: '不传 isStarred 则取反，传入则按指定值设置。',
  })
  @ApiParam({ name: 'id', description: '文案 ID', example: 100 })
  toggleStar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleStarDto,
  ) {
    return this.copyService.toggleStar(user.sub, id, dto.isStarred);
  }

  @Delete('copies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除单条文案' })
  @ApiParam({ name: 'id', description: '文案 ID', example: 100 })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.copyService.remove(user.sub, id);
    return { deleted: true };
  }

  @Delete('copies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量删除文案',
    description: 'body 形如 { ids: number[] }，逐条做归属校验。',
  })
  removeBatch(@CurrentUser() user: JwtPayload, @Body() dto: BatchDeleteDto) {
    return this.copyService.removeBatch(user.sub, dto.ids);
  }
}
