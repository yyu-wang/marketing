import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectService } from './project.service';

/**
 * 项目控制器
 *
 * 路由前缀：/api/projects
 * 全部接口需要 JWT 鉴权（由全局 JwtAuthGuard 强制）。
 * 对应 PRD 9.1：
 *   - POST   /api/projects      创建
 *   - GET    /api/projects      列表
 *   - GET    /api/projects/:id  详情
 *   - PUT    /api/projects/:id  更新
 *   - DELETE /api/projects/:id  删除（级联）
 */
@ApiTags('Project')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projectService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '项目列表' })
  list(@CurrentUser() user: JwtPayload) {
    return this.projectService.list(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '项目详情（含归属校验）' })
  @ApiParam({ name: 'id', description: '项目 ID', example: 1 })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectService.findOneOrFail(user.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  @ApiParam({ name: 'id', description: '项目 ID', example: 1 })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除项目（级联删除其下文案）',
    description: 'PRD 4.3.3：删除项目时级联删除关联文案。',
  })
  @ApiParam({ name: 'id', description: '项目 ID', example: 1 })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.projectService.remove(user.sub, id);
    return { deleted: true };
  }
}
