import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/**
 * 健康检查
 *
 * 路由：/api/health
 * 用途：被负载均衡 / k8s liveness 调用，无需鉴权。
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查', description: '无需鉴权，用于负载均衡 / k8s liveness。' })
  check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
