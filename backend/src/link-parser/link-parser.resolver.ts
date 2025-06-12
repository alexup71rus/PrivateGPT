import { Args, Field, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { LinkParserService } from './link-parser.service';

@ObjectType()
export class LinkContent {
  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@Resolver()
export class LinkParserResolver {
  constructor(private readonly linkParserService: LinkParserService) {}

  @Query(() => LinkContent)
  async fetchLinkContent(
    @Args('urls', { type: () => [String] }) urls: string[],
  ): Promise<LinkContent> {
    return this.linkParserService.fetchLinkContent(urls);
  }
}
