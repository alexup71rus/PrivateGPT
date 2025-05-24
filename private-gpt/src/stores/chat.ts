import { defineStore } from 'pinia';
import { useHttpService } from "@/plugins/httpPlugin";
import type { OllamaModel, OllamaTagsResponse } from "@/types/ollama.ts";
import { type Settings, useAppSettings } from "@/composables/useAppSettings.ts";
import type { Chat, Message } from "@/types/chats.ts";
import { throttle } from "@/utils/helpers.ts";

const throttledPersist = throttle((chats: Chat[]) => {
  localStorage.setItem('privateGPTChats', JSON.stringify(chats));
}, 1000);

export const useChatStore = defineStore('chat', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useAppSettings();
    const savedChats = localStorage.getItem('privateGPTChats');
    const memory = localStorage.getItem('privateGPTMemory');

    return {
      http,
      savedChats,
      settings: settings as Settings,
      isAsideOpen: false,
      models: [] as OllamaModel[],
      memory: memory ? JSON.parse(memory) : [],
      chats: (savedChats ? JSON.parse(savedChats) : []) as Chat[],
      activeChatId: '',
      abortController: null as AbortController | null,
    };
  },
  getters: {
    activeChat(state): Chat | undefined {
      return state.chats.find(chat => chat.id === state.activeChatId);
    },
  },
  actions: {
    persistChats() {
      throttledPersist(this.chats);
    },

    setAside(value: boolean) {
      this.isAsideOpen = value;
    },

    initialize() {
      if (this.chats.length === 0) {
        this.createChat();
      }
    },

    createChat() {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: 'Новый чат',
        messages: [],
      };

      this.chats.unshift(newChat);
      this.activeChatId = newChat.id;
      this.persistChats();

      return newChat;
    },

    deleteChat(chatId: string) {
      const index = this.chats.findIndex(chat => chat.id === chatId);
      if (index !== -1) {
        this.chats.splice(index, 1);
        if (this.activeChatId === chatId) {
          this.activeChatId = this.chats[0]?.id || this.createChat()?.id as string;
        }
        this.persistChats();
      }
    },

    renameChat(chatId: string, newTitle: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) chat.title = newTitle;
      this.persistChats();
    },

    addMessage(chatId: string, message: Omit<Message, 'id'>) {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        const newMessage = { ...message, id: crypto.randomUUID() };
        chat.messages.push(newMessage);
        return newMessage.id;
      }
      return null;
    },

    findMessage(chatId: string, messageId: string): Message | undefined {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;
      return chat.messages.find(m => m.id === messageId);
    },

    updateMessage(chatId: string, messageId: string, content: string) {
      const message = this.findMessage(chatId, messageId);

      if (message) {
        message.content = content;
      }
    },

    async sendMessage(chatId: string, content: string) {
      try {
        const chat = this.activeChat;
        if (!chat) throw new Error('No active chat');

        if (!this.models.length) {
          throw new Error('No models available');
        }

        if (this.abortController) {
          this.abortController.abort();
        }
        this.abortController = new AbortController();

        const userMessageId = this.addMessage(chatId, { role: 'user', content });
        if (!userMessageId) return;

        const response = await fetch(`${this.settings.ollamaLink}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.settings.selectedModel ? this.settings.selectedModel : this.settings.defaultModel || this.models[0].name,
            messages: chat.messages.map(msg => ({ role: msg.role, content: msg.content })),
            stream: true,
          }),
          signal: this.abortController.signal,
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let assistantMessageId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            const message = this.findMessage(chatId, assistantMessageId!);

            if (message) {
              delete message?.isLoading
            }

            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.role === 'assistant' && data.message.content) {
                if (!assistantMessageId) {
                  assistantMessageId = this.addMessage(chatId, { role: 'assistant', content: '', isLoading: true });
                }
                assistantContent += data.message.content;
                this.updateMessage(chatId, assistantMessageId!, assistantContent);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }

        if (!assistantMessageId) {
          this.deleteMessage(chatId, userMessageId);
          throw new Error('No assistant response received');
        }

        this.persistChats();
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Failed to stream message from Ollama:', error);
          throw error;
        }
      } finally {
        this.abortController = null;
      }
    },

    editMessage(chatId: string, messageId: string, newContent: string, dropFollowing: boolean = false) {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;
      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chat.messages[index].content = newContent;
        if (dropFollowing) {
          chat.messages = chat.messages.slice(0, index + 1);
        }
        this.persistChats();
      }
    },

    deleteMessage(chatId: string, messageId: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;
      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chat.messages = chat.messages.slice(0, index);
        this.persistChats();
      }
    },

    async regenerateMessage(chatId: string, messageId: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;
      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index <= 0) return;
      const prevMessage = chat.messages[index - 1];
      if (prevMessage.role !== 'user') return;

      chat.messages = chat.messages.slice(0, index - 1);
      this.persistChats();

      await this.sendMessage(chatId, prevMessage.content);
    },

    async saveSummary(chatId: string, messageId: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;

      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      const recentMessages = chat.messages.slice(Math.max(0, messageIndex - 3), messageIndex + 1);

      if (!recentMessages.length) {
        throw new Error('Нет сообщений для создания саммари');
      }

      const keyword = 'Недостаточно данных';

      try {
        const response = await this.http.request({
          method: 'POST',
          url: `${this.settings.ollamaLink}/api/chat`,
          data: {
            model: this.settings.selectedModel || this.settings.defaultModel || this.models[0].name,
            messages: [
              {
                role: 'system',
                content: `Анализируй последние сообщения и создай краткое описание (1-2 предложения) с ключевыми фактами. Если данных недостаточно, верни "${keyword}".`
              },
              ...recentMessages.map(m => ({
                role: m.role,
                content: m.content,
              })),
            ],
            stream: false,
          },
        });

        const summary = response?.message?.content?.trim();
        if (summary && !summary.toLowerCase().includes(keyword.toLowerCase())) {
          this.memory.push(summary);
          localStorage.setItem('privateGPTMemory', JSON.stringify(this.memory));
        } else {
          throw new Error(summary || 'Пустой ответ от модели');
        }
      } catch (error) {
        console.error('Ошибка при сохранении саммари:', error);
        throw error;
      }
    },

    async fetchModels() {
      try {
        const response = await this.http.request<OllamaTagsResponse>({
          method: 'GET',
          url: `${this.settings.ollamaLink}/api/tags`,
        });
        this.models = response.models || [];
        return this.models;
      } catch (error) {
        console.error('Failed to fetch Ollama models:', error);
        this.models = [];
        return [];
      }
    },
  },
})
