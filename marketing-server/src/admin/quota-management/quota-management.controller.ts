import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { QuotaQueryDto } from './dto/quota-query.dto';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { QuotaManagementService } from './quota-management.service';

@Controller('admin/quota')
@UseGuards(AdminGuard)
export class QuotaManagementController {
  constructor(private readonly quotaService: QuotaManagementService) {}

  @Get()
  list(@Query() query: QuotaQueryDto) {
    return this.quotaService.list(query);
  }

  @Patch(':userId')
  setLimit(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateQuotaDto,
  ) {
    return this.quotaService.setLimit(userId, dto.dailyQuota);
  }
}
