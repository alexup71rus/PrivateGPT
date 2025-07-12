import { Module } from '@nestjs/common';
import { SearchResolver } from './search.resolver';
import { SearchService } from './search.service';
import { WebUtilsModule } from '../web-utils/web-utils.module';

@Module({
  imports: [WebUtilsModule],
  providers: [SearchResolver, SearchService],
  exports: [SearchService, SearchResolver],
})
export class SearchModule {}
