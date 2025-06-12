import { Module } from '@nestjs/common';
import { LinkParserService } from './link-parser.service';
import { LinkParserResolver } from './link-parser.resolver';
import { WebUtilsModule } from '../web-utils/web-utils.module';

@Module({
  imports: [WebUtilsModule],
  providers: [LinkParserService, LinkParserResolver],
  exports: [LinkParserService],
})
export class LinkParserModule {}
