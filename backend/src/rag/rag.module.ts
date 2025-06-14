import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagService } from './rag.service';
import { RagResolver } from './rag.resolver';
import { Embedding } from './embedding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Embedding])],
  providers: [RagService, RagResolver],
  exports: [RagService],
})
export class RagModule {}
