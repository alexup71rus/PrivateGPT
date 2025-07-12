import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './event.entity';
import { EventsService } from './events.service';
import { EventsResolver } from './events.resolver';
import { PubSub } from 'graphql-subscriptions';
import { ChatsModule } from '../chats/chats.module';
import { SettingsModule } from '../settings/settings.module';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { SearchModule } from '../search/search.module'; // Импорт SearchModule

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    ChatsModule,
    SettingsModule,
    HttpModule,
    ScheduleModule.forRoot(),
    SearchModule,
  ],
  providers: [
    EventsService,
    EventsResolver,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
})
export class EventsModule {}
