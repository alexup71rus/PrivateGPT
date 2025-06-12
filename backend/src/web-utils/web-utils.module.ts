import { Module } from '@nestjs/common';
import { WebUtilsService } from './web-utils.service';

@Module({
  providers: [WebUtilsService],
  exports: [WebUtilsService],
})
export class WebUtilsModule {}
