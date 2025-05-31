import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsResolver, MemoryEntryEntity } from './chats.resolver';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, MemoryEntryEntity]),
  ],
  providers: [ChatsResolver],
})
export class ChatsModule {}
