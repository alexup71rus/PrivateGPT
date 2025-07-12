import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Event {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field()
  prompt: string;

  @Field()
  time: string;

  @Field()
  isRecurring: boolean;

  @Field(() => [String])
  days: string[];

  @Field()
  specificDate: string;

  @Field()
  enableSearch: boolean;

  @Field({ nullable: true })
  lastNotified?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  chatId?: string;

  @Field({ nullable: true })
  model?: string;
}
