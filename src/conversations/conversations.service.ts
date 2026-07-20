import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Like, Repository } from 'typeorm';
import { REDIS_CLIENT } from '../database/redis.module';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { MessageVersionEntity } from '../database/entities/message-version.entity';
import { findOwnedOrFail } from '../common/utils/ownership';

const CONV_CACHE_TTL_SEC = 300; // 5 分钟

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(MessageVersionEntity)
    private readonly versionRepo: Repository<MessageVersionEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ---------------------------------------------------------------
  // Conversation CRUD
  // ---------------------------------------------------------------

  async create(userId: number, title?: string): Promise<ConversationEntity> {
    return this.conversationRepo.save(
      this.conversationRepo.create({
        userId,
        title: (title && title.trim()) || '新对话',
      }),
    );
  }

  /**
   * 列表：按 created_at desc 取出后端分组（今天 / 昨天 / 更早）。
   * 返回结构：
   *   [{ date: '今天', items: [{id,title,createdAt}] }, ...]
   */
  async list(userId: number, keyword?: string): Promise<
    Array<{
      date: string;
      items: Array<{ id: number; title: string; createdAt: Date }>;
    }>
  > {
    // 无关键词搜索时走缓存
    const cacheKey = `conv:list:${userId}`;
    if (!keyword) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Array<{ date: string; items: Array<{ id: number; title: string; createdAt: Date }> }>;
    }

    const where: Record<string, unknown> = { userId };
    if (keyword) where.title = Like(`%${keyword}%`);

    const list = await this.conversationRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    const groups = new Map<
      string,
      Array<{ id: number; title: string; createdAt: Date }>
    >();
    const todayKey = this.dateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = this.dateKey(yesterday);

    for (const c of list) {
      const k = this.dateKey(c.createdAt);
      let label: string;
      if (k === todayKey) label = '今天';
      else if (k === yesterdayKey) label = '昨天';
      else label = k.replace(/-/g, '/');
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push({
        id: Number(c.id),
        title: c.title,
        createdAt: c.createdAt,
      });
    }
    const result = Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));

    if (!keyword) {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CONV_CACHE_TTL_SEC);
    }

    return result;
  }

  async getDetail(
    userId: number,
    conversationId: number,
    page = 1,
    pageSize = 50,
  ): Promise<{
    id: number;
    title: string;
    createdAt: Date;
    messages: MessageEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const conv = await this.findOwned(userId, conversationId);
    const total = await this.messageRepo.count({
      where: { conversationId: conv.id },
    });
    const messages = await this.messageRepo.find({
      where: { conversationId: conv.id },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      id: Number(conv.id),
      title: conv.title,
      createdAt: conv.createdAt,
      messages,
      total,
      page,
      pageSize,
    };
  }

  async rename(
    userId: number,
    conversationId: number,
    title: string,
  ): Promise<ConversationEntity> {
    const conv = await this.findOwned(userId, conversationId);
    conv.title = title.trim() || conv.title;
    const result = await this.conversationRepo.save(conv);
    await this.invalidateListCache(userId);
    return result;
  }

  async remove(userId: number, conversationId: number): Promise<void> {
    const conv = await this.findOwned(userId, conversationId);
    await this.conversationRepo.delete(conv.id);
    await this.invalidateListCache(userId);
  }

  // ---------------------------------------------------------------
  // Message
  // ---------------------------------------------------------------

  /**
   * 落用户消息 + 占位 assistant 消息
   *
   * 返回的 assistantMessageId 由前端透传给 SSE 端点完成异步生成。
   */
  async postMessage(
    userId: number,
    conversationId: number,
    payload: { text?: string; imageUrls?: string[] },
  ): Promise<{ userMessageId: number; assistantMessageId: number }> {
    const text = (payload.text ?? '').trim();
    const imageUrls = payload.imageUrls?.length ? payload.imageUrls : null;
    if (!text && !imageUrls) {
      throw new BadRequestException('文本与图片至少需提供一项');
    }

    const conv = await this.findOwned(userId, conversationId);

    // 首条用户消息时同步对话标题
    const isFirst =
      (await this.messageRepo.count({
        where: { conversationId: conv.id },
      })) === 0;

    const userMsg = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conv.id,
        role: 'user',
        content: text || null,
        imageUrls: imageUrls ?? null,
        status: 'done',
      }),
    );

    const assistantMsg = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conv.id,
        role: 'assistant',
        content: null,
        status: 'pending',
      }),
    );

    if (isFirst) {
      const titleSrc = text || '图片创作';
      conv.title = titleSrc.slice(0, 30);
    }
    conv.updatedAt = new Date();
    await this.conversationRepo.save(conv);

    await this.invalidateListCache(userId);

    return {
      userMessageId: Number(userMsg.id),
      assistantMessageId: Number(assistantMsg.id),
    };
  }

  /**
   * 按 assistantMessageId 加载消息 + 同对话 user 消息（提供给 AIService）
   */
  async loadAssistantContext(
    userId: number,
    assistantMessageId: number,
  ): Promise<{
    assistant: MessageEntity;
    user: MessageEntity;
    conversation: ConversationEntity;
  }> {
    const assistant = await this.messageRepo.findOne({
      where: { id: assistantMessageId },
    });
    if (!assistant || assistant.role !== 'assistant') {
      throw new NotFoundException('assistant 消息不存在');
    }
    const conv = await this.findOwned(userId, Number(assistant.conversationId));

    // 取该对话下最新一条 user 消息（顺序保存保证 user.id < assistant.id）
    const user = await this.messageRepo.findOne({
      where: { conversationId: conv.id, role: 'user' },
      order: { id: 'DESC' },
    });

    if (!user) throw new NotFoundException('未找到关联的 user 消息');

    return { assistant, user, conversation: conv };
  }

  async updateAssistantMessage(
    assistantMessageId: number,
    patch: Partial<Pick<MessageEntity, 'content' | 'status'>>,
  ): Promise<void> {
    await this.messageRepo.update(assistantMessageId, patch);
  }

  /**
   * 编辑用户消息
   *
   * 仅允许编辑 role=user 的消息。
   * 编辑后删除该消息之后的所有消息，并自动创建 assistant 占位消息，
   * 前端直接拿 assistantMessageId 启动流式生成。
   */
  async editMessage(
    userId: number,
    conversationId: number,
    messageId: number,
    content: string,
  ): Promise<{ conversationId: number; messageId: number; assistantMessageId: number }> {
    const conv = await this.findOwned(userId, conversationId);

    const message = await this.messageRepo.findOne({ where: { id: messageId, conversationId: conv.id } });
    if (!message) throw new NotFoundException('消息不存在');
    if (message.role !== 'user') throw new BadRequestException('仅允许编辑用户消息');

    const oldUserContent = message.content;

    // 更新消息内容
    message.content = content;
    await this.messageRepo.save(message);

    // 查找该消息之后的所有消息
    const laterMessages = await this.messageRepo.find({
      where: { conversationId: conv.id },
      order: { id: 'ASC' },
    });
    const later = laterMessages.filter((m) => Number(m.id) > Number(messageId));

    // 找到第一个 assistant 消息，保存交换版本后复用
    const firstAssistant = later.find((m) => m.role === 'assistant');
    let assistantMsg: MessageEntity;

    if (firstAssistant) {
      // 将旧的提问+回答作为一个交换版本保存到 assistant 消息上
      await this.saveMessageVersion(firstAssistant.id, firstAssistant.content, oldUserContent);
      firstAssistant.content = null;
      firstAssistant.status = 'pending';
      assistantMsg = await this.messageRepo.save(firstAssistant);

      // 删除除复用 assistant 之外的其他后续消息
      const idsToDelete = later
        .filter((m) => m.id !== firstAssistant.id)
        .map((m) => m.id);
      if (idsToDelete.length > 0) {
        await this.messageRepo.delete(idsToDelete);
      }
    } else {
      // 没有后续 assistant 消息，清理后续消息并创建新占位
      const idsToDelete = later.map((m) => m.id);
      if (idsToDelete.length > 0) {
        await this.messageRepo.delete(idsToDelete);
      }
      assistantMsg = await this.messageRepo.save(
        this.messageRepo.create({
          conversationId: conv.id,
          role: 'assistant',
          content: null,
          status: 'pending',
        }),
      );
    }

    conv.updatedAt = new Date();
    await this.conversationRepo.save(conv);
    await this.invalidateListCache(userId);

    return {
      conversationId: Number(conv.id),
      messageId: Number(message.id),
      assistantMessageId: Number(assistantMsg.id),
    };
  }

  // ---------------------------------------------------------------
  // 版本管理
  // ---------------------------------------------------------------

  /** 保存消息的旧版本，可附带配对的用户提问内容 */
  async saveMessageVersion(
    messageId: number,
    content: string | null,
    userContent?: string | null,
  ): Promise<void> {
    if (!content) return;

    const maxResult = await this.versionRepo.findOne({
      where: { messageId },
      order: { version: 'DESC' },
      select: ['version'],
    });
    const nextVersion = (maxResult?.version ?? 0) + 1;

    await this.versionRepo.save(
      this.versionRepo.create({ messageId, version: nextVersion, content, userContent }),
    );
  }

  /** 获取消息的所有历史版本 */
  async getMessageVersions(messageId: number): Promise<MessageVersionEntity[]> {
    return this.versionRepo.find({
      where: { messageId },
      order: { version: 'DESC' },
      select: ['id', 'messageId', 'version', 'content', 'userContent', 'createdAt'],
    });
  }

  /** 恢复到指定版本，同时恢复配对的用户提问（如有） */
  async restoreMessageVersion(
    userId: number,
    conversationId: number,
    messageId: number,
    versionId: number,
  ): Promise<{ content: string; userContent?: string }> {
    await this.findOwned(userId, conversationId);

    const version = await this.versionRepo.findOne({ where: { id: versionId, messageId } });
    if (!version) throw new NotFoundException('版本记录不存在');

    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('消息不存在');

    message.content = version.content;
    await this.messageRepo.save(message);

    // 如果有配对的用户提问，同时恢复用户消息
    if (version.userContent) {
      const allMsgs = await this.messageRepo.find({
        where: { conversationId },
        select: ['id', 'role'],
        order: { id: 'ASC' },
      });
      // 找到该 assistant 消息之前最近的 user 消息
      const prevUser = allMsgs
        .reverse()
        .find((m) => m.role === 'user' && Number(m.id) < Number(messageId));
      if (prevUser) {
        const userMsg = await this.messageRepo.findOne({ where: { id: prevUser.id } });
        if (userMsg) {
          userMsg.content = version.userContent;
          await this.messageRepo.save(userMsg);
        }
      }
    }

    return { content: version.content ?? '', userContent: version.userContent ?? undefined };
  }

  // ---------------------------------------------------------------
  // 私有工具
  // ---------------------------------------------------------------

  private async findOwned(
    userId: number,
    conversationId: number,
  ): Promise<ConversationEntity> {
    return findOwnedOrFail(this.conversationRepo, conversationId, userId, {
      notFoundMsg: '对话不存在',
      hideExistence: true,
    });
  }

  private async invalidateListCache(userId: number): Promise<void> {
    await this.redis.del(`conv:list:${userId}`);
  }

  /** YYYY-MM-DD（UTC+8 自然日） */
  private dateKey(d: Date): string {
    const utc8 = new Date(d.getTime() + 8 * 3600 * 1000);
    return utc8.toISOString().slice(0, 10);
  }
}
