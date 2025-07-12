import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './event.entity';
import { EventInput } from './event.input';
import { PubSub } from 'graphql-subscriptions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ChatsService } from '../chats/chats.service';
import { SettingsService } from '../settings/settings.service';
import { ChatInput } from '../chats/chats.input';
import { SearchService } from '../search/search.service';
import { randomUUID } from 'crypto';
import { AxiosError } from 'axios';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @Inject('PUB_SUB') private pubSub: PubSub,
    private readonly chatsService: ChatsService,
    private readonly settingsService: SettingsService,
    private readonly httpService: HttpService,
    private readonly searchService: SearchService,
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
      console.error(`Event with id ${event.id} not found`);
      throw new NotFoundException(`Event with id ${event.id} not found`);
    }
    return updatedEvent;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    if (!result.affected) {
      console.error(`Failed to delete event with id ${id}`);
    }
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

      const settings = await this.settingsService.getSettings();
      const ollamaUrl = settings.settings.ollamaURL;
      const searxngUrl = settings.settings.searxngURL;
      const searchFormat = settings.settings.searchFormat;
      const systemModel = settings.settings.systemModel || 'llama3';
      const searchModel = settings.settings.searchModel || systemModel;

      if (!ollamaUrl) {
        console.error('Ollama URL not configured');
        return;
      }

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
          await this.eventRepository.update(event.id, {
            lastNotified: currentDate,
          });

          let response: string | null = null;
          const chatId = randomUUID();
          const eventModel = event.model || systemModel;

          if (event.enableSearch) {
            try {
              const searchQueryResponse = await this.httpService
                .post<{ message: { content: string } }>(
                  `${ollamaUrl}/api/chat`,
                  {
                    model: eventModel,
                    messages: [
                      {
                        role: 'system',
                        content: settings.settings.searchPrompt,
                      },
                      { role: 'user', content: event.prompt },
                    ],
                    stream: false,
                  },
                  { headers: { 'Content-Type': 'application/json' } },
                )
                .toPromise();

              const searchQuery =
                searchQueryResponse?.data?.message?.content?.trim();
              if (!searchQuery) {
                console.error(
                  `Failed to generate search query for event ${event.id}`,
                );
                throw new Error('Failed to generate search query');
              }

              const searchResults = await this.searchService.search(
                searchQuery,
                searxngUrl,
                searchFormat,
                settings.settings.searchResultsLimit,
                settings.settings.followSearchLinks,
              );

              const searchContext = `[Search Results: ${searchResults}]`;

              const ollamaResponse = await this.httpService
                .post<{ message: { content: string } }>(
                  `${ollamaUrl}/api/chat`,
                  {
                    model: eventModel,
                    messages: [
                      { role: 'system', content: searchContext },
                      { role: 'user', content: event.prompt },
                    ],
                    stream: false,
                  },
                  { headers: { 'Content-Type': 'application/json' } },
                )
                .toPromise();

              if (!ollamaResponse?.data?.message?.content) {
                console.error(`Invalid Ollama response for event ${event.id}`);
                throw new Error('Invalid Ollama response');
              }
              response = ollamaResponse.data.message.content;
            } catch (err) {
              console.error(
                `Search error for event ${event.id}: ${err.message}`,
              );
              response = `Search failed: ${err.message}`;
            }
          } else {
            try {
              const res = await this.httpService
                .post<{ message: { content: string } }>(
                  `${ollamaUrl}/api/chat`,
                  {
                    model: eventModel,
                    messages: [{ role: 'user', content: event.prompt }],
                    stream: false,
                  },
                  { headers: { 'Content-Type': 'application/json' } },
                )
                .toPromise();
              if (!res?.data?.message?.content) {
                console.error(`Invalid Ollama response for event ${event.id}`);
                throw new Error('Invalid Ollama response');
              }
              response = res.data.message.content;
            } catch (err) {
              const error = err as AxiosError;
              console.error(
                `Ollama error for event ${event.id}: ${error.message}, Status: ${error.response?.status}`,
              );
              response = `Ollama error: ${error.message}`;
            }
          }

          if (response) {
            const chat: ChatInput = {
              id: chatId,
              title: event.title,
              timestamp: Date.now(),
              messages: [
                {
                  id: randomUUID(),
                  content: event.prompt,
                  role: 'user',
                  timestamp: Date.now(),
                },
                {
                  id: randomUUID(),
                  content: response,
                  role: 'assistant',
                  timestamp: Date.now(),
                },
              ],
            };

            await this.chatsService.saveChat(chat);
            await this.eventRepository.update(event.id, { chatId });

            await this.pubSub.publish('notificationTriggered', {
              notificationTriggered: {
                ...event,
                chatId,
                prompt: response || event.prompt,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Task check error:', error);
    }
  }
}
