import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';
import { ChatInput, ChatMetaInput, MessageInput } from './chats.input';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
  ) {}

  async findOne(id: string): Promise<ChatEntity | null> {
    return this.chatRepository.findOne({ where: { id } });
  }

  async saveChat(chat: ChatInput): Promise<ChatEntity> {
    const chatEntity = this.chatRepository.create({
      ...chat,
      systemPrompt: chat.systemPrompt,
      messages: chat.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp ?? Date.now(),
        chat: { id: chat.id },
      })),
    });
    return this.chatRepository.save(chatEntity);
  }

  async updateChatMeta(meta: ChatMetaInput): Promise<ChatEntity> {
    const chat = await this.chatRepository.findOne({ where: { id: meta.id } });
    if (!chat) {
      throw new Error(`Chat with id ${meta.id} not found`);
    }
    const updatedChat = this.chatRepository.merge(chat, {
      title: meta.title ?? chat.title,
      timestamp: meta.timestamp ?? chat.timestamp,
      systemPrompt: meta.systemPrompt ?? chat.systemPrompt,
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

  async replaceChatMessages(
    chatId: string,
    messages: MessageInput[],
  ): Promise<ChatEntity> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['messages'],
    });
    if (!chat) {
      throw new Error(`Chat with id ${chatId} not found`);
    }
    await this.messageRepository.delete({ chat: { id: chatId } });
    const messageEntities = messages.map((msg) =>
      this.messageRepository.create({
        ...msg,
        timestamp: msg.timestamp ?? Date.now(),
        chat: { id: chatId },
      }),
    );
    chat.messages = await this.messageRepository.save(messageEntities);
    return this.chatRepository.save(chat);
  }

  async deleteMessage(chatId: string, messageIds: string[]): Promise<boolean> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new Error(`Chat with id ${chatId} not found`);
    }
    const result = await this.messageRepository.delete({
      id: In(messageIds),
      chat: { id: chatId },
    });
    return result.affected ? result.affected > 0 : false;
  }
}
