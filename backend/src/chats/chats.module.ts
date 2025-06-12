import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsResolver } from './chats.resolver';
import { ChatEntity } from './chat.entity';
import { MessageEntity } from './message.entity';
import { ChatsService } from './chats.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatEntity, MessageEntity])],
  providers: [ChatsResolver, ChatsService],
})
export class ChatsModule {}
