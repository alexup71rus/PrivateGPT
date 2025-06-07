import { Args, Field, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { SearchService } from './search.service';

@ObjectType()
export class SearchResult {
  @Field(() => String, { nullable: false })
  results: string;
}

@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => SearchResult)
  async search(
    @Args('query', { type: () => String }) query: string,
    @Args('url', { type: () => String }) url: string,
    @Args('format', { type: () => String }) format: 'json' | 'html',
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('followLinks', { type: () => Boolean, nullable: true })
    followLinks?: boolean,
  ): Promise<SearchResult> {
    const results = await this.searchService.search(
      query,
      url,
      format,
      limit,
      followLinks,
    );
    return { results };
  }
}
