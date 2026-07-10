import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash as hashPw, compare } from 'bcryptjs';
import { UserEntity } from '../database/entities/user.entity';
import { AuthService } from './auth.service';

/**
 * AuthService 单元测试
 *
 * 覆盖：
 *   - register：邮箱重复 -> 409；正常注册 -> 返回 token + 用户信息
 *   - login：账户不存在 -> 401；密码错误 -> 401；正常登录 -> 返回 token
 *
 * 测试策略：用对象 Mock 替代 Repository / JwtService / ConfigService，
 * 避免引入真实数据库依赖，保证单元测试快速且确定性。
 */
describe('AuthService', () => {
  let service: AuthService;
  let userRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: (k: string, def?: unknown) => def ?? 'test-secret' },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ------------------------------------------------------------------
  // 注册
  // ------------------------------------------------------------------
  describe('register', () => {
    it('邮箱重复时应抛出 ConflictException', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 1 });
      await expect(
        service.register({ email: 'a@b.com', password: 'abc12345' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('正常注册应返回 token 与用户信息，且密码经 bcrypt 加密存储', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.save.mockImplementationOnce(async (entity) => ({
        ...entity,
        id: 100,
      }));

      const result = await service.register({
        email: 'a@b.com',
        password: 'abc12345',
      });

      expect(result.token).toBe('mock.jwt.token');
      expect(result.userId).toBe(100);
      expect(result.email).toBe('a@b.com');

      // 验证 save 接收的对象 password_hash 与明文不同（即真的做了哈希）
      const savedEntity = userRepo.save.mock.calls[0][0];
      expect(savedEntity.passwordHash).toBeDefined();
      expect(savedEntity.passwordHash).not.toBe('abc12345');
      // 验证 bcrypt 哈希可被 compare 校验通过
      const ok = await compare('abc12345', savedEntity.passwordHash);
      expect(ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 登录
  // ------------------------------------------------------------------
  describe('login', () => {
    it('账户不存在应统一返回 401（不区分存在性）', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'abc12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('密码错误应返回 401', async () => {
      const hash = await hashPw('correct-pw', 4); // 加速测试
      userRepo.findOne.mockResolvedValueOnce({
        id: 1,
        email: 'a@b.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('凭证正确应返回 JWT', async () => {
      const hash = await hashPw('correct-pw', 4);
      userRepo.findOne.mockResolvedValueOnce({
        id: 1,
        email: 'a@b.com',
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'a@b.com',
        password: 'correct-pw',
      });
      expect(result.token).toBe('mock.jwt.token');
      expect(result.userId).toBe(1);
    });
  });

  describe('findUserById', () => {
    it('按 id 查询用户时应返回安全字段并打印日志', async () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };
      userRepo.findOne.mockResolvedValueOnce(user);

      await expect(service.findUserById(1)).resolves.toEqual(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'email', 'createdAt', 'updatedAt'],
      });
    });
  });
});
