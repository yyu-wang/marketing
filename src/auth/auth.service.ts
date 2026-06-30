import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/**
 * 认证服务
 *
 * 对应 PRD 4.2 用户认证模块。
 * 提供：注册、登录、密码校验、JWT 签发。
 *
 * 安全要点（PRD 7.2）：
 *   - 密码使用 bcrypt 加密，cost factor >= 12；
 *   - 错误响应不暴露"账户存在性"——账户不存在与密码错误都返回 401；
 *   - 密码字段绝不出现在响应体中。
 */
@Injectable()
export class AuthService {
  /** bcrypt cost factor，遵循 PRD 7.2 安全要求 */
  private readonly BCRYPT_COST = 12;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 注册新用户
   *
   * 流程（PRD 4.2.1）：
   *   1. 校验邮箱唯一性（重复返回 409）；
   *   2. 密码 bcrypt 加密存储；
   *   3. 生成 JWT 并返回（自动登录体验）。
   */
  async register(dto: RegisterDto): Promise<{ token: string; userId: number; email: string }> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id'],
    });
    if (exists) {
      // 重复邮箱：明确返回 409，便于前端实时提示
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_COST);
    const user = await this.userRepo.save(
      this.userRepo.create({ email: dto.email, passwordHash }),
    );

    const token = await this.signToken(user.id, user.email);
    return { token, userId: user.id, email: user.email };
  }

  /**
   * 登录
   *
   * 流程（PRD 4.2.2）：
   *   1. 通过 email 查用户；
   *   2. bcrypt.compare 比对密码；
   *   3. 通过则签发 JWT（默认 7 天有效期）。
   *
   * 异常处理：账户不存在 / 密码错误均返回 401，避免存在性泄漏。
   */
  async login(dto: LoginDto): Promise<{ token: string; userId: number; email: string }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    // 统一返回 401，不区分两种错误
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const token = await this.signToken(user.id, user.email);
    return { token, userId: user.id, email: user.email };
  }

  /**
   * 签发 JWT
   *
   * 签名密钥与有效期从环境变量读取（JWT_SECRET / JWT_EXPIRES_IN）。
   * 默认 7 天，对应 PRD 4.2.2。
   */
  private async signToken(userId: number, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
      },
    );
  }
}
