import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { AttachmentType } from './chats.resolver';

@InputType()
export class AttachmentMetaInput {
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
export class MessageInput {
  @Field()
  id: string;

  @Field()
  content: string;

  @Field()
  role: 'user' | 'assistant';

  @Field(() => Float, { nullable: true })
  timestamp?: number;

  @Field(() => AttachmentMetaInput, { nullable: true })
  attachmentMeta?: AttachmentMetaInput;

  @Field({ nullable: true })
  attachmentContent?: string;
}

@InputType()
export class ChatInput {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => Float)
  timestamp: number;

  @Field({ nullable: true })
  systemPrompt?: string;

  @Field(() => [MessageInput])
  messages: MessageInput[];
}

@InputType()
export class ChatMetaInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  title?: string;

  @Field(() => Float, { nullable: true })
  timestamp?: number;

  @Field({ nullable: true })
  systemPrompt?: string;
}

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  perPage?: number;
}
