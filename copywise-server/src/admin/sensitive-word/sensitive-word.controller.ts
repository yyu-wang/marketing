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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { SensitiveWordService } from './sensitive-word.service';

@Controller('admin/sensitive-words')
@UseGuards(AdminGuard)
export class SensitiveWordController {
  constructor(private readonly service: SensitiveWordService) {}

  @Get()
  list(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('word') word?: string,
    @Query('category') category?: string,
  ) {
    return this.service.list({ page, pageSize, word, category });
  }

  @Post()
  create(@Body() dto: { word: string; category?: string }) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { word?: string; category?: string; isActive?: boolean },
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
