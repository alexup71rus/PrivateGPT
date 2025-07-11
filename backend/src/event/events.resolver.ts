import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.model';
import { EventInput } from './event.input';
import { EventEntity } from './event.entity';
import { PubSub } from 'graphql-subscriptions';
import { Inject } from '@nestjs/common';

@Resolver(() => Event)
export class EventsResolver {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  @Query(() => [Event])
  async events(): Promise<Event[]> {
    return this.eventRepository.find();
  }

  @Mutation(() => Event)
  async createEvent(@Args('event') event: EventInput): Promise<Event> {
    const newEvent = this.eventRepository.create(event);
    return this.eventRepository.save(newEvent);
  }

  @Mutation(() => Event)
  async updateEvent(@Args('event') event: EventInput): Promise<Event> {
    const existingEvent = await this.eventRepository.findOne({
      where: { id: event.id },
    });
    if (!existingEvent) {
      throw new Error(`Event with ID ${event.id} not found`);
    }
    const updatedEvent = this.eventRepository.merge(existingEvent, event);
    return this.eventRepository.save(updatedEvent);
  }

  @Mutation(() => Boolean)
  async deleteEvent(@Args('id') id: string): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  @Subscription(() => Event, {
    name: 'notificationTriggered',
    resolve: (payload) => payload.notificationTriggered,
  })
  notificationTriggered() {
    return this.pubSub.asyncIterableIterator('notificationTriggered');
  }
}
