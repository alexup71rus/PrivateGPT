import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';
import { ChatMetaInput, MessageInput } from './chats.input';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
  ) {}

  async updateChatMeta(meta: ChatMetaInput): Promise<ChatEntity> {
    const chat = await this.chatRepository.findOne({ where: { id: meta.id } });
    if (!chat) {
      throw new Error(`Chat with id ${meta.id} not found`);
    }
    const updatedChat = this.chatRepository.merge(chat, {
      title: meta.title ?? chat.title,
      timestamp: meta.timestamp ?? chat.timestamp,
      systemPrompt: meta.systemPrompt ?? chat.systemPrompt, // Добавляем systemPrompt
    });
    return this.chatRepository.save(updatedChat);
  }

  async saveMessage(
    chatId: string,
    message: MessageInput,
  ): Promise<MessageEntity> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    const messageEntity = this.messageRepository.create({
      ...message,
      timestamp: message.timestamp ?? Date.now(),
      chat: { id: chatId },
    });

    return this.messageRepository.save(messageEntity);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    const result = await this.messageRepository.delete({
      id: messageId,
      chat: { id: chatId },
    });
    return result.affected ? result.affected > 0 : false;
  }
}
