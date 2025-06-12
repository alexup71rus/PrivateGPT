import {
  Args,
  Field,
  Float,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';
import { ChatsService } from './chats.service';
import { ChatInput, ChatMetaInput, MessageInput } from './chats.input';

export enum AttachmentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}
registerEnumType(AttachmentType, { name: 'AttachmentType' });

@ObjectType()
class AttachmentMeta {
  @Field(() => AttachmentType)
  type: AttachmentType;

  @Field()
  name: string;

  @Field(() => Int)
  size: number;

  @Field(() => Float)
  lastModified: number;
}

@ObjectType()
class Message {
  @Field()
  id: string;

  @Field()
  content: string;

  @Field()
  role: 'user' | 'assistant';

  @Field(() => Float, { nullable: true })
  timestamp?: number;

  @Field(() => AttachmentMeta, { nullable: true })
  attachmentMeta?: AttachmentMeta;

  @Field({ nullable: true })
  attachmentContent?: string;
}

@ObjectType()
class Chat {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => Float)
  timestamp: number;

  @Field({ nullable: true })
  systemPrompt?: string; // Добавляем systemPrompt

  @Field(() => [Message])
  messages: Message[];
}

@Resolver(() => Chat)
export class ChatsResolver {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    private chatsService: ChatsService,
  ) {}

  private mapMessageEntityToMessage = (entity: MessageEntity): Message => {
    return {
      id: entity.id,
      content: entity.content,
      role: entity.role,
      timestamp: entity.timestamp,
      attachmentMeta: entity.attachmentMeta
        ? {
            type: entity.attachmentMeta.type?.toUpperCase() as AttachmentType,
            name: entity.attachmentMeta.name,
            size: entity.attachmentMeta.size,
            lastModified: entity.attachmentMeta.lastModified,
          }
        : undefined,
      attachmentContent: entity.attachmentContent,
    };
  };

  private mapChatEntityToChat = (entity: ChatEntity): Chat => {
    return {
      id: entity.id,
      title: entity.title,
      timestamp: entity.timestamp,
      systemPrompt: entity.systemPrompt, // Добавляем systemPrompt
      messages: entity.messages.map(this.mapMessageEntityToMessage),
    };
  };

  @Query(() => [Chat])
  async getChats(): Promise<Chat[]> {
    const chatEntities = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.messages', 'message')
      .orderBy('chat.timestamp', 'DESC')
      .addOrderBy('message.timestamp', 'ASC')
      .getMany();
    return chatEntities.map(this.mapChatEntityToChat);
  }

  @Mutation(() => Chat)
  async saveChat(@Args('chat') chat: ChatInput): Promise<Chat> {
    const chatEntity = this.chatRepository.create({
      ...chat,
      systemPrompt: chat.systemPrompt, // Добавляем systemPrompt
      messages: chat.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp ?? Date.now(),
        chat: { id: chat.id },
      })),
    });
    const savedEntity = await this.chatRepository.save(chatEntity);
    return this.mapChatEntityToChat(savedEntity);
  }

  @Mutation(() => Boolean)
  async deleteChat(@Args('id') id: string): Promise<boolean> {
    const result = await this.chatRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  @Mutation(() => Boolean)
  async clearChats(): Promise<boolean> {
    const chats = await this.chatRepository.find();
    await this.chatRepository.remove(chats);
    return true;
  }

  @Mutation(() => Message)
  async saveMessage(
    @Args('chatId') chatId: string,
    @Args('message') message: MessageInput,
  ): Promise<Message> {
    const savedMessage = await this.chatsService.saveMessage(chatId, message);
    return this.mapMessageEntityToMessage(savedMessage);
  }

  @Mutation(() => Boolean)
  async deleteMessage(
    @Args('chatId') chatId: string,
    @Args('messageId') messageId: string,
  ): Promise<boolean> {
    return this.chatsService.deleteMessage(chatId, messageId);
  }

  @Mutation(() => Chat)
  async updateChatMeta(@Args('meta') meta: ChatMetaInput): Promise<Chat> {
    const updatedChat = await this.chatsService.updateChatMeta(meta);
    return this.mapChatEntityToChat(updatedChat);
  }
}
