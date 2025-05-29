import {defineStore} from 'pinia';
import {useHttpService} from '@/plugins/httpPlugin';
import type {OllamaModel, OllamaTagsResponse} from '@/types/ollama.ts';
import type {Attachment, AttachmentMeta, Chat, MemoryEntry, Message} from '@/types/chats.ts';
import {throttle} from '@/utils/helpers.ts';
import type {ISettings} from '@/types/settings.ts';
import {clearAllChats, deleteChat, loadChats, loadMemory, saveChat, saveMemory} from '@/utils/storage.ts';
import {useSettingsStore} from "@/stores/settings.ts";

const throttledSaveChat = throttle(async (chat: Chat) => {
  await saveChat(chat);
}, 500);

export const useChatStore = defineStore('chat', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useSettingsStore();

    return {
      http,
      settings: settings as ISettings,
      models: [] as OllamaModel[],
      memory: [] as MemoryEntry[],
      chats: [] as Chat[],
      activeChatId: '',
      isGeneratingTitle: false,
      isSending: false,
      abortController: null as AbortController | null,
    };
  },
  getters: {
    activeChat(state): Chat | undefined {
      return state.chats.find(chat => chat.id === state.activeChatId);
    },
    selectedModel(): string {
      return this.settings.selectedModel || this.settings.defaultModel || this.models[0]?.name || '';
    },
  },
  actions: {
    async initialize() {
      this.chats = await loadChats();
      this.memory = await loadMemory();
    },

    async persistChat(chatId: string) {
      try {
        const chat = this.getChat(chatId);
        if (chat) {
          await throttledSaveChat(chat);
        }
      } catch (error) {
        console.error('Failed to persist chat:', error);
      }
    },

    getChat(chatId: string): Chat | undefined {
      return this.chats.find(c => c.id === chatId);
    },

    getMessage(chatId: string, messageId: string): Message | undefined {
      return this.getChat(chatId)?.messages.find(m => m.id === messageId);
    },

    shouldGenerateTitle(chat: Chat): boolean {
      return !chat.title || chat.title === this.settings.defaultChatTitle;
    },

    setIsSending(value: boolean) {
      this.isSending = value;
    },

    async createChat() {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: this.settings.defaultChatTitle,
        messages: [],
        timestamp: new Date().getTime()
      };

      this.chats.unshift(newChat);
      this.activeChatId = newChat.id;
      await this.persistChat(newChat.id);

      return newChat;
    },

    async deleteChat(chatId: string) {
      const index = this.chats.findIndex(chat => chat.id === chatId);
      if (index !== -1) {
        this.chats.splice(index, 1);
        await deleteChat(chatId);

        if (this.activeChatId === chatId) {
          this.activeChatId = this.chats[0]?.id || (await this.createChat())?.id || '';
        }
      }
    },

    async clearChats() {
      try {
        this.chats = [];
        this.activeChatId = '';
        await clearAllChats();
        this.activeChatId = (await this.createChat()).id;
      } catch (error) {
        console.error('Error clearing chats:', error);
        throw error;
      }
    },

    async renameChat(chatId: string, newTitle: string) {
      const chat = this.getChat(chatId);
      if (chat) {
        chat.title = newTitle;
        await this.persistChat(chatId);
      }
    },

    async addMessage(chatId: string, message: Omit<Message, 'id'>, attachment?: { content: string, type: 'text' | 'image', meta: File }) {
      const chat = this.getChat(chatId);

      if (chat) {
        const newMessage = {
          ...message,
          id: crypto.randomUUID(),
          ...(attachment && {
            attachmentMeta: {
              type: attachment.type,
              name: attachment.meta.name,
              size: attachment.meta.size,
              lastModified: attachment.meta.lastModified,
            } as AttachmentMeta,
            attachmentContent: attachment.content,
          }),
        };

        chat.messages.push(newMessage);
        await this.persistChat(chatId);

        return newMessage.id;
      }

      return null;
    },

    async updateMessage(chatId: string, messageId: string, content: string, isLoading?: boolean, thinkTime?: number, isThinking?: boolean) {
      const message = this.getMessage(chatId, messageId);
      if (message) {
        message.content = content;
        if (isLoading !== undefined) {
          if (isLoading) {
            message.isLoading = true;
          } else {
            delete message.isLoading;
          }
        }
        if (thinkTime !== undefined) {
          message.thinkTime = thinkTime;
        }
        if (isThinking !== undefined) {
          message.isThinking = isThinking;
        }

        await this.persistChat(chatId);
      }
    },

    async generateChatTitle(chatId: string) {
      const chat = this.getChat(chatId);
      if (!chat || chat.messages.length < 1) return;

      const generateDefaultTitle = (content: string | undefined): string => {
        if (!content) return this.settings.defaultChatTitle;
        const words = content.split(' ').filter((_, i) => i <= 2);
        return words.length > 0 ? words.join(' ') : this.settings.defaultChatTitle;
      };

      if (!this.settings.systemModel) {
        const newTitle = generateDefaultTitle(chat.messages[0]?.content);
        await this.renameChat(chatId, newTitle);
        return;
      }

      if (chat.messages.length < 2) {
        const newTitle = generateDefaultTitle(chat.messages[0]?.content);
        await this.renameChat(chatId, newTitle);
        return;
      }

      const messages = chat.messages.slice(0, 2);

      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaLink}/api/chat`,
          data: {
            model: this.settings.systemModel,
            messages: [
              { role: 'system', content: this.settings.titlePrompt },
              ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            ],
            stream: false,
            format: {
              type: 'object',
              properties: { title: { type: 'string' } },
              required: ['title'],
            },
          },
        });

        const content = response?.message?.content;
        if (!content) throw new Error('No content in API response');

        const parsed = JSON.parse(content);
        const newTitle = parsed?.title;
        if (typeof newTitle !== 'string' || !newTitle) {
          throw new Error('Invalid title in API response');
        }

        await this.renameChat(chatId, newTitle);
      } catch (error) {
        console.error('Error generating chat title:', error);
        const newTitle = generateDefaultTitle(chat.messages[0]?.content);
        await this.renameChat(chatId, newTitle);
      }
    },

    async sendMessage(chatId: string, content: string, attachmentContent: Attachment | null = null) {
      try {
        const chat = this.activeChat;
        if (!chat) throw new Error('No active chat');
        if (!this.models.length) throw new Error('No models available');

        this.abortController?.abort();
        this.abortController = new AbortController();

        let finalContent = content;
        let images: string[] | undefined;
        let userMessageId: string | null;

        if (attachmentContent) {
          const file = attachmentContent.meta;
          const metaInfo = `[Attached: ${file.name}, ${file.size} bytes, modified ${new Date(file.lastModified).toLocaleDateString()}]`;

          if (attachmentContent.type === 'image') {
            images = [attachmentContent.content];
            finalContent = `<hidden>${metaInfo}</hidden>${finalContent}`;
          } else if (attachmentContent.type === 'text') {
            finalContent = `<hidden>
${attachmentContent.content}
${metaInfo}
</hidden>${content}`;
          }

          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent }, attachmentContent);
        } else {
          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent });
        }

        if (!userMessageId) return;

        let thinkStartTime: number | null = null;
        let isInThinkBlock = false;
        let assistantMessageId: string | null = null;
        let assistantContent = '';
        let thinkTimeInterval: number | null = null;

        const startThinkTimeUpdates = () => {
          if (thinkTimeInterval) clearInterval(thinkTimeInterval);
          thinkTimeInterval = setInterval(async () => {
            if (isInThinkBlock && thinkStartTime && assistantMessageId) {
              const currentThinkTime = Date.now() - thinkStartTime;
              await this.updateMessage(chatId, assistantMessageId, assistantContent, true, currentThinkTime, true);
            }
          }, 100);
        };

        const cleanup = () => {
          if (thinkTimeInterval) {
            clearInterval(thinkTimeInterval);
            thinkTimeInterval = null;
          }
          if (assistantMessageId && isInThinkBlock) {
            isInThinkBlock = false;
            const finalThinkTime = thinkStartTime ? Date.now() - thinkStartTime : undefined;
            this.updateMessage(chatId, assistantMessageId, assistantContent, false, finalThinkTime, false);
          }
        };

        this.abortController.signal.addEventListener('abort', cleanup);

        if (images) {
          const body = {
            model: this.selectedModel,
            prompt: finalContent,
            images,
            stream: true,
          };

          const response = await fetch(`${this.settings.ollamaLink}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: this.abortController.signal,
          });

          if (!response.body) throw new Error('No response body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  const chunkContent = data.response;

                  // Проверяем начало think-блока
                  if (chunkContent.includes('<think>') && !isInThinkBlock) {
                    thinkStartTime = Date.now();
                    isInThinkBlock = true;
                    startThinkTimeUpdates();
                  }

                  // Проверяем конец think-блока
                  if (chunkContent.includes('</think>') && isInThinkBlock) {
                    isInThinkBlock = false;
                    if (thinkTimeInterval) clearInterval(thinkTimeInterval);
                    thinkTimeInterval = null;
                  }

                  assistantMessageId ??= await this.addMessage(chatId, {
                    role: 'assistant',
                    content: '',
                    isLoading: true,
                    thinkTime: thinkStartTime && isInThinkBlock ? Date.now() - thinkStartTime : undefined,
                    isThinking: isInThinkBlock,
                  });
                  assistantContent += chunkContent;
                  await this.updateMessage(chatId, assistantMessageId!, assistantContent, true, thinkStartTime && isInThinkBlock ? Date.now() - thinkStartTime : undefined, isInThinkBlock);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }

          if (assistantMessageId) {
            const message = this.getMessage(chatId, assistantMessageId);
            if (message) {
              const finalThinkTime = isInThinkBlock && thinkStartTime ? Date.now() - thinkStartTime : message.thinkTime;
              if (thinkTimeInterval) clearInterval(thinkTimeInterval);
              thinkTimeInterval = null;
              await this.updateMessage(chatId, assistantMessageId, message.content, false, finalThinkTime, false);
            }
          }
        } else {
          const body = {
            model: this.selectedModel,
            messages: chat.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              ...(msg.attachmentContent && msg.attachmentMeta?.type === 'image' ? { images: [msg.attachmentContent] } : {})
            })),
            stream: true,
          };

          const response = await fetch(`${this.settings.ollamaLink}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: this.abortController.signal,
          });

          if (!response.body) throw new Error('No response body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.message?.role === 'assistant' && data.message.content) {
                  const chunkContent = data.message.content;

                  // Проверяем начало think-блока
                  if (chunkContent.includes('<think>') && !isInThinkBlock) {
                    thinkStartTime = Date.now();
                    isInThinkBlock = true;
                    startThinkTimeUpdates();
                  }

                  // Проверяем конец think-блока
                  if (chunkContent.includes('</think>') && isInThinkBlock) {
                    isInThinkBlock = false;
                    if (thinkTimeInterval) clearInterval(thinkTimeInterval);
                    thinkTimeInterval = null;
                  }

                  assistantMessageId ??= await this.addMessage(chatId, {
                    role: 'assistant',
                    content: '',
                    isLoading: true,
                    thinkTime: thinkStartTime && isInThinkBlock ? Date.now() - thinkStartTime : undefined,
                    isThinking: isInThinkBlock,
                  });
                  assistantContent += chunkContent;
                  await this.updateMessage(chatId, assistantMessageId!, assistantContent, true, thinkStartTime && isInThinkBlock ? Date.now() - thinkStartTime : undefined, isInThinkBlock);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }

          if (assistantMessageId) {
            const message = this.getMessage(chatId, assistantMessageId);
            if (message) {
              const finalThinkTime = isInThinkBlock && thinkStartTime ? Date.now() - thinkStartTime : message.thinkTime;
              if (thinkTimeInterval) clearInterval(thinkTimeInterval);
              thinkTimeInterval = null;
              await this.updateMessage(chatId, assistantMessageId, message.content, false, finalThinkTime, false);
            }
          }
        }

        if (this.activeChat && this.shouldGenerateTitle(this.activeChat)) {
          this.isGeneratingTitle = true;
          await this.generateChatTitle(chatId);
          this.isGeneratingTitle = false;
        }
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

    async editMessage(
      chatId: string,
      messageId: string,
      newContent: string,
      dropFollowing: boolean = false,
    ): Promise<void> {
      const chat = this.getChat(chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);

      if (index !== -1) {
        chat.messages[index].content = newContent;

        if (dropFollowing) {
          chat.messages = chat.messages.slice(0, index + 1);
        }

        await this.persistChat(chatId);
      }
    },

    async deleteMessage(chatId: string, messageId: string) {
      const chat = this.getChat(chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chat.messages = chat.messages.slice(0, index);
        await this.persistChat(chatId);
      }
    },

    async regenerateMessage(chatId: string, messageId: string) {
      const chat = this.getChat(chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index <= 0) return;

      const prevMessage = chat.messages[index - 1];
      if (prevMessage.role !== 'user') return;

      chat.messages = chat.messages.slice(0, index - 1);
      await this.persistChat(chat.id);

      await this.sendMessage(chatId, prevMessage.content, prevMessage.attachmentContent ? {
        content: prevMessage.attachmentContent,
        type: prevMessage.attachmentMeta?.type || 'text',
        meta: prevMessage.attachmentMeta as File
      } : null);
    },

    async saveSummary(chatId: string, messageId: string) {
      const chat = this.getChat(chatId);
      if (!chat) return;

      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      const recentMessages = chat.messages.slice(Math.max(0, messageIndex - 3), messageIndex + 1);

      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaLink}/api/chat`,
          data: {
            model: this.settings.systemModel,
            messages: [
              { role: 'system', content: this.settings.memoryPrompt },
              ...recentMessages,
            ],
            stream: false,
            format: {
              type: 'object',
              properties: {
                facts: {
                  type: 'array',
                  items: { type: 'string' }
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

          await saveMemory(this.memory);
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
