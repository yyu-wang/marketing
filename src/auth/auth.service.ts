import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, compare } from 'bcryptjs';
import { createHash } from 'crypto';
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
  private readonly logger = new Logger(AuthService.name);
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
  async register(dto: RegisterDto): Promise<{ token: string; userId: number; email: string; role: string; nickname: string }> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id'],
    });
    if (exists) {
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await hash(dto.password, this.BCRYPT_COST);
    const user = await this.userRepo.save(
      this.userRepo.create({ email: dto.email, nickname: dto.nickname, passwordHash, passwordVersion: 1 }),
    );

    const token = await this.signToken(user.id, user.email, user.role);
    return { token, userId: user.id, email: user.email, role: user.role, nickname: user.nickname };
  }

  /**
   * 登录
   *
   * 流程（PRD 4.2.2）：
   *   1. 通过 email 查用户；
   *   2. bcrypt.compare 比对密码；
   *   3. 通过则签发 JWT（默认 7 天有效期）。
   *
   * 哈希版本兼容：
   *   - hashVersion=1：客户端发送 SHA-256 哈希，直接 bcrypt.compare
   *   - hashVersion=0/未传（旧客户端）：客户端发送明文，比对成功后自动
   *     升级为 SHA-256 格式存储
   *
   * 异常处理：账户不存在 / 密码错误均返回 401，避免存在性泄漏。
   */
  async login(dto: LoginDto): Promise<{ token: string; userId: number; email: string; role: string; nickname: string }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (user.isActive === 0) {
      throw new UnauthorizedException('该账户已被停用，请联系管理员');
    }

    const isHashed = dto.hashVersion && dto.hashVersion >= 1;

    if (isHashed) {
      const matched = await compare(dto.password, user.passwordHash);
      if (!matched) {
        if (user.passwordVersion === 0) {
          this.logger.warn(
            `Password format mismatch for ${user.email} — DB is legacy format. ` +
            `Migration should run on next startup.`,
          );
        }
        throw new UnauthorizedException('邮箱或密码错误');
      }
    } else {
      // 旧客户端：明文密码
      const matched = await compare(dto.password, user.passwordHash);
      if (!matched) {
        throw new UnauthorizedException('邮箱或密码错误');
      }
      // 自动升级为 SHA-256 格式
      const sha256Hash = createHash('sha256').update(dto.password).digest('hex');
      user.passwordHash = await hash(sha256Hash, this.BCRYPT_COST);
      await this.userRepo.save(user);
      this.logger.log(`Password auto-upgraded to SHA-256 for user ${user.email}`);
    }

    const token = await this.signToken(user.id, user.email, user.role);
    return { token, userId: user.id, email: user.email, role: user.role, nickname: user.nickname };
  }

  /**
   * 更新当前用户个人资料（昵称）
   */
  async updateProfile(userId: number, nickname: string): Promise<{ nickname: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'nickname'] });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    user.nickname = nickname;
    await this.userRepo.save(user);
    return { nickname: user.nickname };
  }

  /**
   * 按 ID 查询用户信息（调试/排查使用）
   *
   * 说明：这里使用 TypeORM 的 Repository.findOne 进行精确查询。
   * 在控制台中打印查询结果，便于定位数据。实际项目中建议避免把
   * passwordHash 直接返回给前端。
   */
  async findUserById(userId: number): Promise<Partial<UserEntity> | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nickname', 'createdAt', 'updatedAt'],
    });

    this.logger.debug(`[findUserById] userId=${userId} found=${!!user}`);
    return user;
  }

  /**
   * 签发 JWT
   *
   * 签名密钥与有效期从环境变量读取（JWT_SECRET / JWT_EXPIRES_IN）。
   * 默认 7 天，对应 PRD 4.2.2。
   */
  private async signToken(userId: number, email: string, role: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
      },
    );
  }
}
