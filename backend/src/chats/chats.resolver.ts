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
import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

// Enum for AttachmentType
enum AttachmentType {
  TEXT = 'text',
  IMAGE = 'image',
}
registerEnumType(AttachmentType, { name: 'AttachmentType' });

// TypeORM Entities
@Entity()
class AttachmentMetaEntity {
  @Column()
  type: AttachmentType;

  @Column()
  name: string;

  @Column()
  size: number;

  @Column('float')
  lastModified: number;
}

@Entity()
class MessageEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  content: string;

  @Column()
  role: string;

  @Column({ type: 'float', nullable: true })
  timestamp?: number;

  @Column(() => AttachmentMetaEntity)
  attachmentMeta?: AttachmentMetaEntity;

  @Column({ nullable: true })
  attachmentContent?: string;
}

@Entity()
export class ChatEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('float')
  timestamp: number;

  @Column(() => MessageEntity)
  messages: MessageEntity[];
}

@Entity()
export class MemoryEntryEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  text: string;

  @Column('float')
  timestamp: number;
}

// GraphQL Types
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
  role: string;

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
  text: string;

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
  role: string;

  @Field(() => Float, { nullable: true })
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
  text: string;

  @Field(() => Float)
  timestamp: number;
}

// Resolver
@Resolver(() => Chat)
export class ChatsResolver {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(MemoryEntryEntity)
    private memoryRepository: Repository<MemoryEntryEntity>,
  ) {}

  @Query(() => [Chat])
  async getChats(): Promise<Chat[]> {
    return this.chatRepository.find();
  }

  @Mutation(() => Chat)
  async saveChat(@Args('chat') chat: ChatInput): Promise<Chat> {
    const chatEntity = this.chatRepository.create(chat);
    return this.chatRepository.save(chatEntity);
  }

  @Mutation(() => Boolean)
  async deleteChat(@Args('id') id: string): Promise<boolean> {
    const result = await this.chatRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  @Mutation(() => Boolean)
  async clearChats(): Promise<boolean> {
    await this.chatRepository.clear();
    return true;
  }

  @Query(() => [MemoryEntry])
  async getMemory(): Promise<MemoryEntry[]> {
    return this.memoryRepository.find();
  }

  @Mutation(() => [MemoryEntry])
  async saveMemory(
    @Args('entries', { type: () => [MemoryEntryInput] })
    entries: MemoryEntryInput[],
  ): Promise<MemoryEntry[]> {
    await this.memoryRepository.clear();
    const memoryEntities = this.memoryRepository.create(entries);
    return this.memoryRepository.save(memoryEntities);
  }
}
