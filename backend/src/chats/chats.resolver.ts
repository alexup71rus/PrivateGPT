import {
  Resolver,
  Query,
  Mutation,
  Args,
  InputType,
  ObjectType,
  Field,
  Int,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { MemoryEntity } from './memory.entity';
import { MessageEntity } from './message.entity';

enum AttachmentType {
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

  @Field(() => [Message])
  messages: Message[];
}

@ObjectType()
class MemoryEntry {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field()
  content: string;

  @Field(() => Float)
  timestamp: number;
}

@InputType()
class AttachmentMetaInput {
  @Field(() => AttachmentType)
  type: AttachmentType;

  @Field()
  name: string;

  @Field(() => Int)
  size: number;

  @Field(() => Float)
  lastModified: number;
}

@InputType()
class MessageInput {
  @Field()
  id: string;

  @Field()
  content: string;

  @Field()
  role: 'user' | 'assistant';

  @Field(() => Float)
  timestamp?: number;

  @Field(() => AttachmentMetaInput, { nullable: true })
  attachmentMeta?: AttachmentMetaInput;

  @Field({ nullable: true })
  attachmentContent?: string;
}

@InputType()
class ChatInput {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => Float)
  timestamp: number;

  @Field(() => [MessageInput])
  messages: MessageInput[];
}

@InputType()
class MemoryEntryInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field()
  content: string;

  @Field(() => Float)
  timestamp: number;
}

@Resolver(() => Chat)
export class ChatsResolver {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(MemoryEntity)
    private memoryRepository: Repository<MemoryEntity>,
  ) {}

  private mapMessageEntityToMessage = (entity: MessageEntity): Message => {
    return {
      id: entity.id,
      content: entity.content,
      role: entity.role,
      timestamp: entity.timestamp,
      attachmentMeta: entity.attachmentMeta
        ? {
            type: entity.attachmentMeta.type?.toLocaleUpperCase() as AttachmentType,
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

  // Memory Queries and Mutations
  @Query(() => [MemoryEntry])
  async getMemory(): Promise<MemoryEntry[]> {
    return this.memoryRepository.find();
  }

  @Mutation(() => MemoryEntry)
  async saveMemoryEntry(
    @Args('entry') entry: MemoryEntryInput,
  ): Promise<MemoryEntry> {
    try {
      const memoryEntity = this.memoryRepository.create(entry);
      return await this.memoryRepository.save(memoryEntity);
    } catch (error) {
      throw new Error(`Failed to save memory entry: ${error}`);
    }
  }

  @Mutation(() => [MemoryEntry])
  async saveMemoryEntries(
    @Args('entries', { type: () => [MemoryEntryInput] })
    entries: MemoryEntryInput[],
  ): Promise<MemoryEntry[]> {
    try {
      const memoryEntities = this.memoryRepository.create(entries);
      return await this.memoryRepository.save(memoryEntities);
    } catch (error) {
      throw new Error(`Failed to save memory entries: ${error}`);
    }
  }

  @Mutation(() => MemoryEntry)
  async updateMemoryEntry(
    @Args('entry') entry: MemoryEntryInput,
  ): Promise<MemoryEntry> {
    try {
      if (!entry.id) {
        throw new Error('MemoryEntry ID is required for update');
      }
      const existingEntry = await this.memoryRepository.findOne({
        where: { id: entry.id },
      });
      if (!existingEntry) {
        throw new Error(`MemoryEntry with ID ${entry.id} not found`);
      }
      const updatedEntry = this.memoryRepository.merge(existingEntry, entry);
      return await this.memoryRepository.save(updatedEntry);
    } catch (error) {
      throw new Error(`Failed to update memory entry: ${error}`);
    }
  }

  @Mutation(() => Boolean)
  async deleteMemoryEntry(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    try {
      const result = await this.memoryRepository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      throw new Error(`Failed to delete memory entry: ${error}`);
    }
  }

  @Mutation(() => Boolean)
  async clearMemory(): Promise<boolean> {
    try {
      await this.memoryRepository.clear();
      return true;
    } catch (error) {
      throw new Error(`Failed to clear memory: ${error}`);
    }
  }
}
