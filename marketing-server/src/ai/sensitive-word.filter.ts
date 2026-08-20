import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../database/redis.module';
import { SensitiveWordEntity } from '../database/entities/sensitive-word.entity';

const SENSITIVE_WORD_CHANNEL = 'sensitive-word:changed';
/** 实例标识：广播时用于忽略自己发的消息，避免本机重复重载 */
const INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  word: string;
}

interface ReloadMessage {
  type: 'reload';
  from: string;
}

@Injectable()
export class SensitiveWordFilter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensitiveWordFilter.name);
  private root: TrieNode = { children: new Map(), isEnd: false, word: '' };
  /** 独立 Pub/Sub 连接：subscribe() 会将该连接置为订阅模式，
   *  必须与共享连接（get/set/publish）分离，否则全站 Redis 读写抛错 */
  private readonly pubSubClient: Redis;

  constructor(
    @InjectRepository(SensitiveWordEntity)
    private readonly wordRepo: Repository<SensitiveWordEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.pubSubClient = redis.duplicate();
  }

  async onModuleInit(): Promise<void> {
    await this.reloadSafe();
    try {
      await this.pubSubClient.subscribe(SENSITIVE_WORD_CHANNEL);
    } catch (err) {
      this.logger.warn(`敏感词热更新订阅失败，仅支持本机重载: ${err?.message ?? err}`);
    }
    this.pubSubClient.on('message', this.handleMessage);
  }

  async onModuleDestroy(): Promise<void> {
    this.pubSubClient.off('message', this.handleMessage);
    try {
      await this.pubSubClient.unsubscribe(SENSITIVE_WORD_CHANNEL);
    } catch {
      /* 连接可能已关闭，忽略 */
    }
    this.pubSubClient.disconnect();
  }

  /**
   * 敏感词变更后通知各实例重载：广播 Pub/Sub 消息。
   * 发布失败时回退本机重载，保证单实例下管理操作仍即时生效。
   */
  async publishChange(): Promise<void> {
    const message: ReloadMessage = { type: 'reload', from: INSTANCE_ID };
    try {
      await this.redis.publish(SENSITIVE_WORD_CHANNEL, JSON.stringify(message));
    } catch (err) {
      this.logger.warn(`敏感词变更广播失败，回退本地重载: ${err?.message ?? err}`);
      await this.reloadSafe();
    }
  }

  private handleMessage = (channel: string, message: string): void => {
    if (channel !== SENSITIVE_WORD_CHANNEL) return;
    try {
      const payload = JSON.parse(message) as ReloadMessage;
      if (payload.type !== 'reload' || payload.from === INSTANCE_ID) return;
      void this.reloadSafe();
    } catch {
      /* 忽略无法解析的广播消息 */
    }
  };

  private async reloadSafe(): Promise<void> {
    try {
      await this.reload();
    } catch (err) {
      this.logger.error(`敏感词库加载失败，将以空词库继续运行: ${err?.message ?? err}`);
      this.root = { children: new Map(), isEnd: false, word: '' };
    }
  }

  async reload(): Promise<void> {
    const words = await this.wordRepo.find({
      where: { isActive: true },
      select: ['word'],
    });
    const root: TrieNode = { children: new Map(), isEnd: false, word: '' };
    for (const { word } of words) {
      this.insert(root, word);
    }
    this.root = root;
    this.logger.log(`敏感词库已加载，共 ${words.length} 条`);
  }

  private insert(root: TrieNode, word: string): void {
    let node = root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), isEnd: false, word: '' });
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
    node.word = word;
  }

  contains(text: string): boolean {
    return this.firstMatch(text) !== null;
  }

  firstMatch(text: string): string | null {
    if (!text) return null;
    for (let i = 0; i < text.length; i++) {
      let node = this.root;
      for (let j = i; j < text.length; j++) {
        const child = node.children.get(text[j]);
        if (!child) break;
        node = child;
        if (node.isEnd) {
          this.logger.warn(`敏感词命中: "${node.word}"`);
          return node.word;
        }
      }
    }
    return null;
  }
}
