import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensitiveWordEntity } from '../database/entities/sensitive-word.entity';

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  word: string;
}

@Injectable()
export class SensitiveWordFilter implements OnModuleInit {
  private readonly logger = new Logger(SensitiveWordFilter.name);
  private root: TrieNode = { children: new Map(), isEnd: false, word: '' };

  constructor(
    @InjectRepository(SensitiveWordEntity)
    private readonly wordRepo: Repository<SensitiveWordEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
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
