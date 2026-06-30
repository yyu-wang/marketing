import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';

/**
 * 对话与消息聚合服务
 *
 * 核心职责：
 *   - 对话 CRUD + 按日期分组列表；
 *   - 落用户消息 + 创建占位 assistant 消息（供 SSE 异步填充）；
 *   - 归属校验（防越权）。
 */
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
   * 列表：按 updated_at desc 取出后端分组（今天 / 昨天 / 更早）。
   * 返回结构：
   *   [{ date: '今天', items: [{id,title,updatedAt}] }, ...]
   */
  async list(userId: number): Promise<
    Array<{
      date: string;
      items: Array<{ id: number; title: string; updatedAt: Date }>;
    }>
  > {
    const list = await this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    const groups = new Map<
      string,
      Array<{ id: number; title: string; updatedAt: Date }>
    >();
    const todayKey = this.dateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = this.dateKey(yesterday);

    for (const c of list) {
      const k = this.dateKey(c.updatedAt);
      let label: string;
      if (k === todayKey) label = '今天';
      else if (k === yesterdayKey) label = '昨天';
      else label = k.replace(/-/g, '/');
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push({
        id: Number(c.id),
        title: c.title,
        updatedAt: c.updatedAt,
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
  ): Promise<{
    id: number;
    title: string;
    createdAt: Date;
    messages: MessageEntity[];
  }> {
    const conv = await this.findOwned(userId, conversationId);
    const messages = await this.messageRepo.find({
      where: { conversationId: conv.id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return {
      id: Number(conv.id),
      title: conv.title,
      createdAt: conv.createdAt,
      messages,
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
    payload: { text?: string; imageUrl?: string },
  ): Promise<{ userMessageId: number; assistantMessageId: number }> {
    const text = (payload.text ?? '').trim();
    if (!text && !payload.imageUrl) {
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
        imageUrl: payload.imageUrl ?? null,
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
      await this.conversationRepo.save(conv);
    } else {
      // 触发 updatedAt 刷新，便于侧边栏置顶
      conv.updatedAt = new Date();
      await this.conversationRepo.save(conv);
    }

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

    // 上一条 user 消息（同对话内 id 紧邻、createdAt 在 assistant 之前）
    const user = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversation_id = :cid', { cid: conv.id })
      .andWhere('m.role = :role', { role: 'user' })
      .andWhere('m.id < :aid', { aid: assistant.id })
      .orderBy('m.id', 'DESC')
      .getOne();

    if (!user) throw new NotFoundException('未找到关联的 user 消息');

    return { assistant, user, conversation: conv };
  }

  async updateAssistantMessage(
    assistantMessageId: number,
    patch: Partial<
      Pick<MessageEntity, 'content' | 'xiaohongshu' | 'moments' | 'status'>
    >,
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
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('对话不存在');
    if (Number(conv.userId) !== Number(userId)) {
      throw new NotFoundException('对话不存在');
    }
    return conv;
  }

  /** YYYY-MM-DD（UTC+8 自然日） */
  private dateKey(d: Date): string {
    const utc8 = new Date(d.getTime() + 8 * 3600 * 1000);
    return utc8.toISOString().slice(0, 10);
  }
}
