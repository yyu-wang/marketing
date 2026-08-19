import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

interface FindOwnedOptions {
  notFoundMsg?: string;
  forbiddenMsg?: string;
  /** 设为 true 时越权也返回 NotFound（不暴露资源存在性） */
  hideExistence?: boolean;
}

/**
 * 查找实体并校验所有权，统一各 Service 的 findOwned 模式。
 */
export async function findOwnedOrFail<
  T extends { id: number; userId: number },
>(
  repo: Repository<T>,
  id: number,
  userId: number,
  opts: FindOwnedOptions = {},
): Promise<T> {
  const { notFoundMsg = '资源不存在', forbiddenMsg = '无权访问该资源', hideExistence } = opts;

  const entity = await repo.findOne({
    where: { id },
  } as unknown as Parameters<typeof repo.findOne>[0]);

  if (!entity) throw new NotFoundException(notFoundMsg);
  if (Number(entity.userId) !== Number(userId)) {
    if (hideExistence) throw new NotFoundException(notFoundMsg);
    throw new ForbiddenException(forbiddenMsg);
  }
  return entity;
}
