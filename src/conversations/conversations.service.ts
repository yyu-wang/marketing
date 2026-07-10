import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { findOwnedOrFail } from '../common/utils/ownership';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
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
  async list(userId: number): Promise<
    Array<{
      date: string;
      items: Array<{ id: number; title: string; createdAt: Date }>;
    }>
  > {
    const list = await this.conversationRepo.find({
      where: { userId },
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
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
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
    return this.conversationRepo.save(conv);
  }

  async remove(userId: number, conversationId: number): Promise<void> {
    const conv = await this.findOwned(userId, conversationId);
    await this.conversationRepo.delete(conv.id);
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

  /** YYYY-MM-DD（UTC+8 自然日） */
  private dateKey(d: Date): string {
    const utc8 = new Date(d.getTime() + 8 * 3600 * 1000);
    return utc8.toISOString().slice(0, 10);
  }
}
