import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './event.entity';
import { EventInput } from './event.input';
import { PubSub } from 'graphql-subscriptions';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  async findAll(): Promise<EventEntity[]> {
    return this.eventRepository.find();
  }

  async create(event: EventInput): Promise<EventEntity> {
    const newEvent = this.eventRepository.create(event);
    return this.eventRepository.save(newEvent);
  }

  async update(event: EventInput): Promise<EventEntity> {
    await this.eventRepository.update(event.id, event);
    const updatedEvent = await this.eventRepository.findOneBy({ id: event.id });
    if (!updatedEvent) {
      throw new NotFoundException(`Event with id ${event.id} not found`);
    }
    return updatedEvent;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return !!result.affected && result.affected > 0;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkTasks() {
    try {
      const events = await this.findAll();
      if (!events) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
      const currentDate = now.toISOString().split('T')[0];

      for (const event of events) {
        const [eventHour, eventMin] = event.time.split(':').map(Number);
        const timeDiffMin =
          (currentHour - eventHour) * 60 + (currentMin - eventMin);
        const isTimeWindow = timeDiffMin >= 0 && timeDiffMin <= 2;
        const isDayMatch = event.isRecurring
          ? event.days.includes(currentDay)
          : event.specificDate === currentDate;
        const isAlreadyNotified = event.lastNotified === currentDate;

        if (isTimeWindow && isDayMatch && !isAlreadyNotified) {
          console.log('Публикация уведомления:', event);
          await this.pubSub.publish('notificationTriggered', {
            notificationTriggered: event,
          });
          await this.eventRepository.update(event.id, {
            lastNotified: currentDate,
          });
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке задач:', error);
    }
  }
}
