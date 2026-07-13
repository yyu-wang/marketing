import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Like, Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UserManagementService {
  private readonly BCRYPT_COST = 12;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async list(query: UserQueryDto) {
    const { email, page = 1, pageSize = 20 } = query;
    const where: Record<string, unknown> = {};
    if (email) where.email = Like(`%${email}%`);

    const [list, total] = await this.userRepo.findAndCount({
      where,
      select: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email }, select: ['id'] });
    if (exists) throw new ConflictException('该邮箱已被注册');

    const passwordHash = await hash(dto.password, this.BCRYPT_COST);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role || 'user',
    });
    await this.userRepo.save(user);

    return { id: user.id, email: user.email, role: user.role };
  }

  async update(id: number, dto: UpdateUserDto, currentUserId: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    if (id === currentUserId && dto.role !== undefined) {
      throw new ForbiddenException('不能修改自己的角色');
    }
    if (id === currentUserId && dto.isActive === 0) {
      throw new ForbiddenException('不能停用自己的账户');
    }

    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepo.save(user);
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    user.passwordHash = await hash(dto.newPassword, this.BCRYPT_COST);
    await this.userRepo.save(user);

    return { reset: true };
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) throw new ForbiddenException('不能删除自己的账户');
    const user = await this.userRepo.findOne({ where: { id }, select: ['id'] });
    if (!user) throw new NotFoundException('用户不存在');
    await this.userRepo.remove(user);
    return { deleted: true };
  }
}
