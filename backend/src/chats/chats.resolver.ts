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
import {
  ChatInput,
  ChatMetaInput,
  MessageInput,
  PaginationInput,
} from './chats.input';

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
  systemPrompt?: string;

  @Field(() => [Message], { nullable: true })
  messages?: Message[];
}

@ObjectType()
class PaginatedChats {
  @Field(() => [Chat])
  items: Chat[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  perPage: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
class PaginatedMessages {
  @Field(() => [Message])
  items: Message[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  perPage: number;

  @Field(() => Int)
  totalPages: number;
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
      systemPrompt: entity.systemPrompt,
      messages: entity.messages
        ? entity.messages.map(this.mapMessageEntityToMessage)
        : [],
    };
  };

  @Query(() => PaginatedChats)
  async getChats(
    @Args('pagination', { type: () => PaginationInput, nullable: true })
    pagination?: PaginationInput,
  ): Promise<PaginatedChats> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .orderBy('chat.timestamp', 'DESC');

    const total = await query.getCount();
    let page = pagination?.page ?? 1;
    const perPage =
      pagination?.perPage && pagination.perPage > 0 ? pagination.perPage : 10;

    if (pagination?.page || pagination?.perPage) {
      page = pagination?.page ?? 1;
      query.skip((page - 1) * perPage).take(perPage);
    }

    const chatEntities = await query.getMany();
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

    return {
      items: chatEntities.map(this.mapChatEntityToChat),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  @Query(() => PaginatedMessages)
  async getChatMessages(
    @Args('chatId') chatId: string,
    @Args('pagination', { type: () => PaginationInput, nullable: true })
    pagination?: PaginationInput,
  ): Promise<PaginatedMessages> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.messages', 'message')
      .where('chat.id = :chatId', { chatId })
      .orderBy('message.timestamp', 'ASC');

    const chatEntity = await query.getOne();
    if (!chatEntity) {
      throw new Error(`Chat with id ${chatId} not found`);
    }

    const total = chatEntity.messages?.length ?? 0;
    const page = pagination?.page ?? 1;
    const perPage =
      pagination?.perPage && pagination.perPage > 0 ? pagination.perPage : 10;

    const messages = chatEntity.messages
      ? chatEntity.messages.slice((page - 1) * perPage, page * perPage)
      : [];
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

    return {
      items: messages.map(this.mapMessageEntityToMessage),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  @Mutation(() => Chat)
  async saveChat(@Args('chat') chat: ChatInput): Promise<Chat> {
    const chatEntity = this.chatRepository.create({
      ...chat,
      systemPrompt: chat.systemPrompt,
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
    @Args('messageIds', { type: () => [String] }) messageIds: string[],
  ): Promise<boolean> {
    return this.chatsService.deleteMessage(chatId, messageIds);
  }

  @Mutation(() => Chat)
  async updateChatMeta(@Args('meta') meta: ChatMetaInput): Promise<Chat> {
    const updatedChat = await this.chatsService.updateChatMeta(meta);
    return this.mapChatEntityToChat(updatedChat);
  }
}
