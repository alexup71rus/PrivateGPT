import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsResolver } from './events.resolver';
import { EventsService } from './events.service';
import { EventEntity } from './event.entity';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity]), ScheduleModule.forRoot()],
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
