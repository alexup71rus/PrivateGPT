import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class EventInput {
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

  @Field({ nullable: true })
  model?: string;
}
