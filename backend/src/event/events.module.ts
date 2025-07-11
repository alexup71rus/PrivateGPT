import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { EventsResolver } from './events.resolver';
import { EventsService } from './events.service';
import { EventEntity } from './event.entity';
import { PubSub } from 'graphql-subscriptions';
import { ChatsModule } from '../chats/chats.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    ScheduleModule.forRoot(),
    HttpModule,
    ChatsModule,
    SettingsModule,
  ],
  providers: [
    EventsResolver,
    EventsService,
    {
      provide: 'PUB_SUB',
      useFactory: () => new PubSub(),
    },
  ],
})
export class EventsModule {}
