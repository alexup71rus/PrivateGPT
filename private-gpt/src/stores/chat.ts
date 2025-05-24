import { defineStore } from 'pinia';
import { useHttpService } from "@/plugins/httpPlugin";
import type { OllamaModel, OllamaTagsResponse } from "@/types/ollama.ts";
import { type Settings, useAppSettings } from "@/composables/useAppSettings.ts";
import type {Chat, MemoryEntry, Message} from "@/types/chats.ts";
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
      memory: (memory ? JSON.parse(memory) : []) as MemoryEntry[],
      chats: (savedChats ? JSON.parse(savedChats) : []) as Chat[],
      activeChatId: '',
      isSending: false,
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

    setIsSending(value: boolean) {
      this.isSending = value;
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

    updateMessage(chatId: string, messageId: string, content: string, isLoading?: boolean) {
      const message = this.findMessage(chatId, messageId);

      if (message) {
        message.content = content;

        if (isLoading !== undefined) {
          if (isLoading) {
            message.isLoading = isLoading;
          } else {
            delete message.isLoading;
          }
        }

        this.persistChats();
      }
    },

    async generateChatTitle(chatId: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat || chat.messages.length < 2) return;

      const messages = chat.messages.slice(0, 2); // Take first user and assistant messages

      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaLink}/api/chat`,
          data: {
            model: 'llama3.1:8b-instruct-q4_0',
            messages: [
              {
                role: 'system',
                content: 'You are an assistant that generates a concise chat title based on a user message and assistant response. Return a JSON object with a "title" field containing a short, descriptive title (max 50 characters) summarizing the conversation topic.'
              },
              ...messages.map(msg => ({ role: msg.role, content: msg.content }))
            ],
            stream: false,
            format: {
              type: 'object',
              properties: { title: { type: 'string' } },
              required: ['title']
            }
          }
        });

        const newTitle = JSON.parse(response?.message?.content)?.title;
        if (newTitle) {
          this.renameChat(chatId, newTitle);
        }
      } catch (error) {
        console.error('Error generating chat title:', error);
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
              this.updateMessage(chatId, assistantMessageId!, message.content, false);
            }

            if (!this.activeChat?.title || this.activeChat?.title === 'Новый чат') {
              await this.generateChatTitle(chatId);
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
        console.warn('No messages to summarize');
        return null;
      }

      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaLink}/api/chat`,
          data: {
            model: 'llama3.1:8b-instruct-q4_0',
            messages: [
              {
                role: 'system',
                content: `You are an assistant that extracts factual information about the user based on a short conversation.
Return a JSON object with a "facts" field — an array of short, self-contained facts about the user.
Example: {"facts": ["User has a cat named Barsik."]}.
If there are no strong facts, infer plausible general facts based on the conversation style, preferences, or topics.
Never return an empty array. Always provide at least one reasonable fact.`
                /*
                If there are no strong facts, infer plausible general facts based on the conversation style, preferences, or topics.
                Never return an empty array. Always provide at least one reasonable fact.
                ---
                If there is no factual information, return an empty array.
                */
              },
              ...recentMessages
            ],
            stream: false,
            format: {
              type: 'object',
              properties: {
                facts: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: ['facts']
            }
          }
        });

    const facts = JSON.parse(response?.message?.content)?.facts;

    if (Array.isArray(facts) && facts.length > 0) {
      const summary = facts.join('. ') + '.';
      const now = Date.now();

      this.memory = (this.memory || []).filter(entry => now - entry.timestamp < 1200000);

      this.memory.push({ text: summary, timestamp: now });

      while (this.memory.length > 10) {
        this.memory.shift();
      }

      localStorage.setItem('privateGPTMemory', JSON.stringify(this.memory));
      return summary;
    }

        return null;
      } catch (error) {
        console.error('Error while saving summary:', error);
        return null;
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
