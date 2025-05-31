import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsResolver } from './chats.resolver';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';
import { MemoryEntity } from './memory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, MemoryEntity]),
  ],
  providers: [ChatsResolver],
})
export class ChatsModule {}
