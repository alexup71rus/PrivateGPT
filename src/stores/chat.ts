import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import { clearAllChats, deleteChat, loadChats, saveChat, searchBackend, waitForBackend } from '@/api/chats';
import { type OllamaModel, type OllamaTagsResponse } from '@/types/ollama.ts';
import { type Attachment, type AttachmentType, type Chat, type Message } from '@/types/chats.ts';
import { throttle } from '@/utils/helpers.ts';
import { type ISettings } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';
import { useMemoryStore } from '@/stores/memory.ts';

const throttledSaveChat = throttle(async (chat: Chat) => {
  await saveChat(chat);
}, 800);

const handleError = (error: unknown, defaultMessage: string): string => {
  const message = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  return message;
};

const processStream = async (
  response: Response,
  onChunk: (data: any) => Promise<void>
) => {
  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        await onChunk(data);
      } catch (e) {
        console.error('Error parsing chunk:', e);
      }
    }
  }
};

export const useChatStore = defineStore('chat', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useSettingsStore();
    const memory = useMemoryStore();

    return {
      http,
      settings: settings as ISettings,
      memory,
      connectionStatus: 'disconnected' as 'connected' | 'disconnected' | 'checking',
      lastConnectionCheck: 0,
      models: [] as OllamaModel[],
      chats: [] as Chat[],
      activeChatId: '',
      isGeneratingTitle: false,
      isSearchActive: settings.isSearchAsDefault,
      isSending: false,
      abortController: null as AbortController | null,
      loading: false,
      error: null as string | null,
    };
  },
  getters: {
    activeChat: state => state.chats.find(chat => chat.id === state.activeChatId),
    selectedModel: state => state.settings.selectedModel || state.settings.systemModel || state.models[0]?.name || '',
  },
  actions: {
    async checkOllamaConnection () {
      this.error = null;
      await this.fetchModels();
      this.connectionStatus = this.error === 'Network Error' ? 'disconnected' : 'connected';
      this.lastConnectionCheck = Date.now();
      this.models = this.connectionStatus === 'connected' ? this.models : [];
      return this.connectionStatus === 'connected';
    },

    async fetchChats () {
      this.loading = true;
      try {
        await waitForBackend();
        this.chats = await loadChats();
      } catch (err) {
        this.error = handleError(err, 'Failed to load chats');
      } finally {
        this.loading = false;
      }
    },

    async persistChat (chatId: string) {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        try {
          await throttledSaveChat(chat);
        } catch (error) {
          this.error = handleError(error, 'Failed to persist chat');
        }
      }
    },

    findById<T>(array: T[], id: string, key: keyof T = 'id' as keyof T): T | undefined {
      return array.find(item => item[key] === id);
    },

    shouldGenerateTitle (chat: Chat): boolean {
      return !chat.title || chat.title === this.settings.defaultChatTitle;
    },

    setIsSending (value: boolean) {
      this.isSending = value;
    },

    async createChat () {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: this.settings.defaultChatTitle,
        messages: [],
        timestamp: Date.now(),
      };
      this.chats.unshift(newChat);
      this.activeChatId = newChat.id;
      await this.persistChat(newChat.id);
      return newChat;
    },

    async deleteChat (chatId: string) {
      this.loading = true;
      try {
        await deleteChat(chatId);
        await this.fetchChats();
        if (this.activeChatId === chatId) {
          this.activeChatId = this.chats[0]?.id || (await this.createChat()).id;
        }
      } catch (err) {
        this.error = handleError(err, 'Failed to delete chat');
      } finally {
        this.loading = false;
      }
    },

    async clearChats () {
      this.loading = true;
      try {
        await clearAllChats();
        this.chats = [];
        this.activeChatId = (await this.createChat()).id;
      } catch (err) {
        this.error = handleError(err, 'Error clearing chats');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async renameChat (chatId: string, newTitle: string) {
      const chat = this.findById(this.chats, chatId);
      if (chat) {
        chat.title = newTitle;
        await this.persistChat(chatId);
      }
    },

    async addMessage (chatId: string, message: Omit<Message, 'id'>, attachment?: { content: string; type: AttachmentType; timestamp: number; meta: File }) {
      const chat = this.findById(this.chats, chatId);
      if (!chat) return null;

      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: message.timestamp ?? Date.now(),
        ...(attachment && {
          attachmentMeta: {
            type: attachment.type === AttachmentType.TEXT ? AttachmentType.TEXT : AttachmentType.IMAGE,
            name: attachment.meta.name,
            size: attachment.meta.size,
            lastModified: attachment.meta.lastModified,
          },
          attachmentContent: attachment.content,
        }),
      };
      chat.messages.push(newMessage);
      await this.persistChat(chatId);
      return newMessage.id;
    },

    async updateMessage (chatId: string, messageId: string, content: string, isLoading?: boolean, thinkTime?: number, isThinking?: boolean) {
      const chat = this.findById(this.chats, chatId);
      const message = chat?.messages.find(m => m.id === messageId);
      if (message) {
        message.content = content;
        if (isLoading !== undefined) message.isLoading = isLoading;
        if (thinkTime !== undefined) message.thinkTime = thinkTime;
        if (isThinking !== undefined) message.isThinking = isThinking;
        await this.persistChat(chatId);
      }
    },

    async generateChatTitle (chatId: string) {
      const chat = this.findById(this.chats, chatId);
      if (!chat || chat.messages.length < 1) return;

      const generateDefaultTitle = (content?: string) =>
        content?.split(' ').filter((_, i) => i <= 2).join(' ') || this.settings.defaultChatTitle;

      if (!this.settings.systemModel || chat.messages.length < 2) {
        await this.renameChat(chatId, generateDefaultTitle(chat.messages[0]?.content));
        return;
      }

      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaURL}/api/chat`,
          data: {
            model: this.settings.systemModel,
            messages: [
              { role: 'system', content: this.settings.titlePrompt },
              ...chat.messages.slice(0, 2).map(msg => ({ role: msg.role, content: msg.content })),
            ],
            stream: false,
            format: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
          },
        });

        const newTitle = JSON.parse(response?.message?.content || '{}')?.title;
        if (typeof newTitle !== 'string' || !newTitle) throw new Error('Invalid title in API response');
        await this.renameChat(chatId, newTitle);
      } catch (error) {
        await this.renameChat(chatId, generateDefaultTitle(chat.messages[0]?.content));
      }
    },

    async sendMessage (chatId: string, content: string, attachmentContent?: Attachment | null, memoryContent?: string | null) {
      try {
        const chat = this.activeChat;
        if (!chat) throw new Error('No active chat');
        if (!this.models.length) throw new Error('No models available');

        this.abortController?.abort();
        this.abortController = new AbortController();

        let finalContent = content;
        let images: string[] | undefined;
        let userMessageId: string | null;
        let searchResults: string | null = null;

        if (this.isSearchActive) {
          try {
            searchResults = await searchBackend(content, this.settings.searxngURL, this.settings.searchFormat);
            if (searchResults) {
              finalContent = `<search_results>${searchResults}</search_results>${content}`;
            }
          } catch (error) {
            console.error('Search failed:', error);
            // Continue without search results if search fails
          }
        }

        // console.log(searchResults);
        // return;

        if (attachmentContent && Object.keys(attachmentContent).length) {
          const file = attachmentContent.meta;
          const metaInfo = `[Attached: ${file.name}, ${file.size} bytes, modified ${new Date(file.lastModified).toLocaleDateString()}]`;
          if (attachmentContent.type === AttachmentType.IMAGE) {
            images = [attachmentContent.content];
            finalContent = `<hidden>${metaInfo}</hidden>${finalContent}`;
          } else if (attachmentContent.type === AttachmentType.TEXT) {
            finalContent = `<hidden>\n${attachmentContent.content}\n${metaInfo}\n</hidden>${finalContent}`;
          }

          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent, timestamp: Date.now() }, {
            ...attachmentContent,
            type: attachmentContent.type === AttachmentType.TEXT ? AttachmentType.TEXT : AttachmentType.IMAGE,
            timestamp: Date.now(),
          });
        } else {
          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent, timestamp: Date.now() });
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
              await this.updateMessage(chatId, assistantMessageId, assistantContent, true, Date.now() - thinkStartTime, true);
            }
          }, 100);
        };

        const cleanup = () => {
          if (thinkTimeInterval) clearInterval(thinkTimeInterval);
          if (assistantMessageId && isInThinkBlock) {
            this.updateMessage(chatId, assistantMessageId, assistantContent, false, thinkStartTime ? Date.now() - thinkStartTime : undefined, false);
          }
        };

        this.abortController.signal.addEventListener('abort', cleanup);

        const body = images
          ? { model: this.selectedModel, prompt: finalContent, images, stream: true }
          : {
            model: this.selectedModel,
            messages: [
              { role: 'system', content: this.settings.systemPrompt || '' },
              ...(memoryContent ? [{ role: 'system', content: memoryContent }] : []),
              ...(searchResults ? [{ role: 'system', content: `Search results: ${searchResults}` }] : []),
              ...chat.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                ...(msg.attachmentContent && msg.attachmentMeta?.type === AttachmentType.IMAGE ? { images: [msg.attachmentContent] } : {}),
              })),
            ],
            stream: true,
          };

        const response = await fetch(`${this.settings.ollamaURL}/api/${images ? 'generate' : 'chat'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: this.abortController.signal,
        });

        await processStream(response, async data => {
          const chunkContent = images ? data.response : data.message?.content;
          if (!chunkContent) return;

          if (chunkContent.includes('<think>') && !isInThinkBlock) {
            thinkStartTime = Date.now();
            isInThinkBlock = true;
            startThinkTimeUpdates();
          }

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
            timestamp: Date.now(),
          });
          assistantContent += chunkContent;
          await this.updateMessage(chatId, assistantMessageId!, assistantContent, true, thinkStartTime && isInThinkBlock ? Date.now() - thinkStartTime : undefined, isInThinkBlock);
        });

        if (assistantMessageId) {
          const finalThinkTime = isInThinkBlock && thinkStartTime ? Date.now() - thinkStartTime : this.findById(chat.messages, assistantMessageId)?.thinkTime;
          if (thinkTimeInterval) clearInterval(thinkTimeInterval);
          await this.updateMessage(chatId, assistantMessageId, assistantContent, false, finalThinkTime, false);
        }

        if (this.activeChat && this.shouldGenerateTitle(this.activeChat)) {
          this.isGeneratingTitle = true;
          await this.generateChatTitle(chatId);
          this.isGeneratingTitle = false;
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          this.error = handleError(error, 'Failed to stream message from Ollama');
          throw error;
        }
      } finally {
        this.abortController = null;
      }
    },

    async editMessage (chatId: string, messageId: string, newContent: string, dropFollowing: boolean = false) {
      const chat = this.findById(this.chats, chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chat.messages[index].content = newContent;
        if (dropFollowing) chat.messages = chat.messages.slice(0, index + 1);
        await this.persistChat(chatId);
      }
    },

    async deleteMessage (chatId: string, messageId: string) {
      const chat = this.findById(this.chats, chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chat.messages = chat.messages.slice(0, index);
        await this.persistChat(chatId);
      }
    },

    async regenerateMessage (chatId: string, messageId: string) {
      const chat = this.findById(this.chats, chatId);
      if (!chat) return;

      const index = chat.messages.findIndex(m => m.id === messageId);
      if (index <= 0 || chat.messages[index - 1].role !== 'user') return;

      const prevMessage = chat.messages[index - 1];
      chat.messages = chat.messages.slice(0, index - 1);
      await this.persistChat(chat.id);

      await this.sendMessage(chatId, prevMessage.content, prevMessage.attachmentContent ? {
        content: prevMessage.attachmentContent,
        type: prevMessage.attachmentMeta?.type || AttachmentType.TEXT,
        meta: prevMessage.attachmentMeta as File,
      } as Attachment : null, this.memory.getMemoryContent);
    },

    async fetchModels () {
      try {
        const response = await this.http.request<OllamaTagsResponse>({
          method: 'GET',
          url: `${this.settings.ollamaURL}/api/tags`,
        });
        this.models = response.models || [];
        return this.models;
      } catch (error) {
        this.models = [];
        this.error = handleError(error, 'Failed to fetch models');
        return [];
      }
    },
  },
});
