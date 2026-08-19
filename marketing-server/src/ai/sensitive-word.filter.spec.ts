import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { REDIS_CLIENT } from '../database/redis.module';
import { SensitiveWordEntity } from '../database/entities/sensitive-word.entity';
import { SensitiveWordFilter } from './sensitive-word.filter';

const CHANNEL = 'sensitive-word:changed';

/**
 * SensitiveWordFilter 单元测试
 *
 * 覆盖：
 *   - onModuleInit：从 DB 加载词库到内存 Trie 并订阅频道
 *   - publishChange：广播 reload 消息；发布失败时回退本地重载
 *   - 收到他人广播触发重载；忽略自己发的广播（避免重复重载）
 */
describe('SensitiveWordFilter', () => {
  let filter: SensitiveWordFilter;
  let wordRepo: { find: jest.Mock };
  let messageHandler: (channel: string, message: string) => void;
  let redis: {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    publish: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
  };

  beforeEach(async () => {
    wordRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    messageHandler = () => {};
    redis = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(0),
      on: jest.fn((event: string, cb: (c: string, m: string) => void) => {
        if (event === 'message') messageHandler = cb;
        return redis;
      }),
      off: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensitiveWordFilter,
        { provide: getRepositoryToken(SensitiveWordEntity), useValue: wordRepo },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    filter = module.get<SensitiveWordFilter>(SensitiveWordFilter);
  });

  it('onModuleInit 加载启用词库并订阅频道', async () => {
    wordRepo.find.mockResolvedValue([
      { word: '违禁词A' },
      { word: '违禁词B' },
    ]);

    await filter.onModuleInit();

    expect(wordRepo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      select: ['word'],
    });
    expect(redis.subscribe).toHaveBeenCalledWith(CHANNEL);
    expect(redis.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(filter.contains('包含违禁词A的文本')).toBe(true);
    expect(filter.contains('正常文本')).toBe(false);
  });

  it('publishChange 向频道广播 reload 消息', async () => {
    await filter.publishChange();

    expect(redis.publish).toHaveBeenCalledTimes(1);
    const [channel, raw] = redis.publish.mock.calls[0];
    expect(channel).toBe(CHANNEL);
    const payload = JSON.parse(raw as string);
    expect(payload.type).toBe('reload');
    expect(payload.from).toEqual(expect.any(String));
  });

  it('收到他人广播时触发重载，新词即时生效', async () => {
    wordRepo.find.mockResolvedValueOnce([{ word: '旧词' }]);
    await filter.onModuleInit();
    expect(filter.contains('旧词')).toBe(true);

    wordRepo.find.mockResolvedValueOnce([{ word: '新词' }]);
    messageHandler(CHANNEL, JSON.stringify({ type: 'reload', from: 'other-instance' }));
    await new Promise((r) => setTimeout(r, 0));

    expect(wordRepo.find).toHaveBeenCalledTimes(2);
    expect(filter.contains('新词')).toBe(true);
    expect(filter.contains('旧词')).toBe(false);
  });

  it('忽略自己发布的广播，避免重复重载', async () => {
    wordRepo.find.mockResolvedValue([{ word: '词汇' }]);
    await filter.onModuleInit();
    const initialFindCount = wordRepo.find.mock.calls.length;

    await filter.publishChange();
    const selfMessage = redis.publish.mock.calls[0][1] as string;
    messageHandler(CHANNEL, selfMessage);
    await new Promise((r) => setTimeout(r, 0));

    expect(wordRepo.find).toHaveBeenCalledTimes(initialFindCount);
  });

  it('publishChange 发布失败时回退本地重载', async () => {
    wordRepo.find.mockResolvedValue([{ word: '词汇' }]);
    redis.publish.mockRejectedValueOnce(new Error('redis down'));
    await filter.onModuleInit();
    const initialFindCount = wordRepo.find.mock.calls.length;

    await filter.publishChange();

    expect(wordRepo.find).toHaveBeenCalledTimes(initialFindCount + 1);
    expect(filter.contains('词汇')).toBe(true);
  });
});
