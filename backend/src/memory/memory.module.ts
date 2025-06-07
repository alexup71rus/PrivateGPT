import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryResolver } from './memory.resolver';
import { MemoryEntity } from './memory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MemoryEntity])],
  providers: [MemoryResolver],
})
export class MemoryModule {}
