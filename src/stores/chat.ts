import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import {
  clearAllChats,
  deleteChat,
  deleteMessage,
  fetchLinkContent,
  loadChats,
  saveChat,
  saveChatMeta,
  saveMessage,
  searchBackend,
  waitForBackend,
} from '@/api/chats';
import { type OllamaModel, type OllamaTagsResponse } from '@/types/ollama.ts';
import { type Attachment, AttachmentType, type Chat, type Message } from '@/types/chats.ts';
import {
  createThrottledFunction,
  extractLinks,
  extractStringFromResponse,
  findById,
  handleError,
  processStream,
} from '@/utils/helpers.ts';
import { type ISettings, type SystemPrompt } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';
import { useMemoryStore } from '@/stores/memory.ts';
import type { SearchResultItem } from '../../backend/src/search/search.service.ts';
import { buildOllamaRequestBody } from '@/utils/messageUtils.ts';

const throttledSaveChat = createThrottledFunction(saveChat, 2000);
const throttledSaveMessage = createThrottledFunction(saveMessage, 800);
const throttledSaveChatMeta = createThrottledFunction(saveChatMeta, 800);

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
      activeChat: null as Chat | null,
      isGeneratingTitle: false,
      isSearchActive: settings.isSearchAsDefault,
      isSending: false,
      abortController: null as AbortController | null,
      loading: false,
      error: null as string | null,
    };
  },
  getters: {
    selectedModel: state => state.settings.selectedModel || state.settings.systemModel || state.models[0]?.name || '',
  },
  actions: {
    syncActiveChat () {
      this.activeChat = (this.chats.find(chat => chat.id === this.activeChatId) || null);
    },

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
        this.chats = (await loadChats()).map(chat => ({
          ...chat,
          systemPrompt: chat.systemPrompt || null,
        }));
        this.syncActiveChat();
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

    async persistMessage (chatId: string, message: Message) {
      try {
        await throttledSaveMessage(chatId, message);
      } catch (error) {
        this.error = handleError(error, 'Failed to persist message');
      }
    },

    async persistChatMeta (meta: { id: string; title?: string; timestamp?: number; systemPrompt?: string | null }) {
      try {
        await throttledSaveChatMeta(meta);
      } catch (error) {
        this.error = handleError(error, 'Failed to persist chat meta');
      }
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
        systemPrompt: this.settings.defaultSystemPrompt,
      };
      this.chats.unshift(newChat);
      this.activeChatId = newChat.id;
      this.syncActiveChat();
      await this.persistChat(newChat.id);
      return newChat;
    },

    async setSystemPrompt (chatId: string, systemPrompt: SystemPrompt | null) {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.systemPrompt = systemPrompt;
        await this.persistChatMeta({ id: chatId, systemPrompt: systemPrompt?.content ?? null });
      }
    },

    async deleteChat (chatId: string) {
      this.loading = true;
      try {
        await deleteChat(chatId);
        await this.fetchChats();
        if (this.activeChatId === chatId) {
          this.activeChatId = this.chats[0]?.id || (await this.createChat()).id;
          this.syncActiveChat();
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
        this.syncActiveChat();
      } catch (err) {
        this.error = handleError(err, 'Error clearing chats');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async renameChat (chatId: string, newTitle: string) {
      const chat = findById(this.chats, chatId);
      if (chat) {
        chat.title = newTitle;
        await this.persistChatMeta({ id: chatId, title: newTitle });
      }
    },

    async addMessage (chatId: string, message: Omit<Message, 'id'>, attachment?: { content: string; type: AttachmentType; timestamp: number; meta: File }) {
      const chat = findById(this.chats, chatId);
      if (!chat) return null;

      if (message.role !== 'user' && message.role !== 'assistant') {
        return null;
      }

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
      chat.timestamp = Date.now();
      this.chats.sort((a, b) => b.timestamp - a.timestamp);
      await this.persistMessage(chatId, newMessage);
      await this.persistChatMeta({ id: chatId, timestamp: chat.timestamp });

      return newMessage.id;
    },

    async updateMessage (chatId: string, messageId: string, content: string, isLoading?: boolean, thinkTime?: number, isThinking?: boolean) {
      const chat = findById(this.chats, chatId);
      const message = chat?.messages.find(m => m.id === messageId);
      if (message) {
        message.content = content;
        if (isLoading !== undefined) message.isLoading = isLoading;
        if (thinkTime !== undefined) message.thinkTime = thinkTime;
        if (isThinking !== undefined) message.isThinking = isThinking;
        await this.persistMessage(chatId, message);
      }
    },

    async generateChatTitle (chatId: string): Promise<void> {
      const chat = findById(this.chats, chatId);
      if (!chat || chat.messages.length < 1) return;

      const generateDefaultTitle = (content?: string): string =>
        content?.split(' ').slice(0, 5).join(' ') || this.settings.defaultChatTitle;

      if (!this.settings.systemModel && !this.settings.selectedModel) {
        await this.renameChat(chatId, generateDefaultTitle(chat.messages[0]?.content));
        return;
      }

      try {
        const userMessages = chat.messages
          .filter(msg => msg.role === 'user')
          .slice(-2);
        const contextMessages = userMessages.length > 0 ? userMessages : chat.messages.slice(-1);

        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaURL}/api/chat`,
          data: {
            model: this.settings.systemModel || this.settings.selectedModel,
            messages: [
              { role: 'system', content: this.settings.titlePrompt },
              ...contextMessages,
              { role: 'user', content: 'Generate the title.' },
            ],
            stream: false,
          },
        });

        let newTitle = response?.message?.content?.trim();
        if (!newTitle) {
          console.warn('Empty title generated for messages:', contextMessages);
          newTitle = generateDefaultTitle(userMessages[0]?.content || chat.messages[0]?.content);
        } else {
          newTitle = extractStringFromResponse(newTitle);
          const textContent = newTitle.replace(/[\p{Emoji}]/gu, '');
          if (newTitle.length > 50 || textContent.length < 3) {
            console.warn('Invalid title generated:', newTitle, 'for messages:', contextMessages);
            newTitle = generateDefaultTitle(userMessages[0]?.content || chat.messages[0]?.content);
          }
        }

        await this.renameChat(chatId, newTitle);
      } catch (error) {
        console.warn('Failed to generate title:', error);
        await this.renameChat(chatId, generateDefaultTitle(chat.messages[0]?.content));
      }
    },

    async sendMessage (chatId: string, content: string, attachmentContent?: Attachment | null, memoryContent?: string | null) {
      try {
        const chat = this.activeChat;
        if (!chat) throw new Error('No active chat');
        if (!this.models.length) throw new Error('No models available');

        if (!content.trim() && !attachmentContent) {
          console.warn('No content or attachment provided');
          throw new Error('Message content or attachment is required');
        }

        this.abortController?.abort();
        this.abortController = new AbortController();

        const finalContent = content.trim() || '';
        let userMessageId: string | null;
        let searchResults: SearchResultItem[] | null = null;
        let linkContent: { urls: string[]; content?: string; error?: string } | null = null;
        let textFileContent: { content: string; meta: { name: string; size: number } } | null = null;
        const hasAttachment = !!(attachmentContent && Object.keys(attachmentContent).length);

        const urls = extractLinks(finalContent);
        if (urls?.length) {
          try {
            console.log(urls);
            const result = await fetchLinkContent(urls);
            linkContent = { urls, content: result.content, error: result.error };
          } catch (error) {
            linkContent = { urls, error: 'Failed to fetch link content' };
          }
        } else if (this.isSearchActive) {
          try {
            const searchModel = this.settings.searchModel || this.settings.selectedModel || this.settings.systemModel;
            if (!searchModel) throw new Error('No search model available');

            const searchQueryResponse = await this.http.request({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              url: `${this.settings.ollamaURL}/api/chat`,
              data: {
                model: searchModel,
                messages: [
                  { role: 'system', content: this.settings.searchPrompt },
                  { role: 'user', content },
                ],
                stream: false,
              },
            });

            const searchQuery = searchQueryResponse?.message?.content?.trim();
            if (!searchQuery) throw new Error('Failed to generate search query');

            searchResults = await searchBackend(
              searchQuery,
              this.settings.searxngURL,
              this.settings.searchFormat,
              {
                searchResultsLimit: this.settings.searchResultsLimit,
                followSearchLinks: this.settings.followSearchLinks,
              }
            );
          } catch (error) {
            console.error('Search failed:', error);
          }
        }

        if (hasAttachment) {
          const file = attachmentContent!.meta;
          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent, timestamp: Date.now() }, {
            ...attachmentContent!,
            type: attachmentContent!.type === AttachmentType.TEXT ? AttachmentType.TEXT : AttachmentType.IMAGE,
            timestamp: Date.now(),
            content: attachmentContent!.content,
          });
          if (attachmentContent!.type === AttachmentType.TEXT) {
            textFileContent = { content: attachmentContent!.content, meta: { name: file.name, size: file.size } };
          }
        } else {
          userMessageId = await this.addMessage(chatId, { role: 'user', content: finalContent, timestamp: Date.now() });
        }

        if (!userMessageId) {
          console.error('Failed to add message');
          return;
        }

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

        const { body, images } = buildOllamaRequestBody(
          chat,
          this.selectedModel,
          userMessageId,
          finalContent,
          attachmentContent,
          memoryContent,
          searchResults,
          linkContent,
          textFileContent
        );

        const response = await fetch(`${this.settings.ollamaURL}/api/${hasAttachment && attachmentContent!.type === AttachmentType.IMAGE ? 'generate' : 'chat'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: this.abortController.signal,
        });

        await processStream(response, async data => {
          const chunkContent = hasAttachment && attachmentContent!.type === AttachmentType.IMAGE ? data.response : data.message?.content;
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
          const finalThinkTime = isInThinkBlock && thinkStartTime ? Date.now() - thinkStartTime : findById(chat.messages, assistantMessageId)?.thinkTime;
          if (thinkTimeInterval) clearInterval(thinkTimeInterval);
          await this.updateMessage(chatId, assistantMessageId, assistantContent, false, finalThinkTime, false);
        }

        if (this.activeChat && this.shouldGenerateTitle(this.activeChat)) {
          this.isGeneratingTitle = true;
          await this.generateChatTitle(chatId);
          this.isGeneratingTitle = false;
        }

        this.chats.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          this.error = handleError(error, 'Failed to stream message from Ollama');
          console.error('sendMessage error:', error);
          throw error;
        }
      } finally {
        this.abortController = null;
      }
    },

    async editMessage (chatId: string, messageId: string, newContent: string, dropFollowing: boolean = false) {
      const chat = findById(this.chats, chatId);
      if (!chat) return;

      try {
        const index = chat.messages.findIndex(m => m.id === messageId);
        if (index === -1) return;

        const message = chat.messages[index];
        if (message.role !== 'user') {
          return;
        }

        if (dropFollowing) {
          message.content = newContent;
          await this.persistMessage(chatId, message);

          const messageIdsToDelete = chat.messages.slice(index + 1).map(m => m.id);
          chat.messages = chat.messages.slice(0, index + 1);
          chat.timestamp = Date.now();
          this.chats.sort((a, b) => b.timestamp - a.timestamp);

          await deleteMessage(chatId, messageIdsToDelete);
          await this.persistChatMeta({ id: chatId, timestamp: chat.timestamp });

          await this.sendMessage(chatId, newContent, message.attachmentContent ? {
            content: message.attachmentContent,
            type: message.attachmentMeta?.type || AttachmentType.TEXT,
            meta: message.attachmentMeta as File,
          } : undefined, this.memory.getMemoryContent);
        } else {
          message.content = newContent;
          await this.persistMessage(chatId, message);
        }
      } catch (error) {
        this.error = handleError(error, 'Failed to edit message');
      }
    },

    async deleteMessage (chatId: string, messageId: string) {
      const chat = findById(this.chats, chatId);
      if (!chat) return;

      try {
        const index = chat.messages.findIndex(m => m.id === messageId);
        if (index === -1) return;

        const messageIdsToDelete = chat.messages.slice(index).map(m => m.id);

        chat.messages = chat.messages.slice(0, index);
        chat.timestamp = Date.now();
        this.chats.sort((a, b) => b.timestamp - a.timestamp);

        await deleteMessage(chatId, messageIdsToDelete);
        await this.persistChatMeta({ id: chatId, timestamp: chat.timestamp });
      } catch (error) {
        this.error = handleError(error, 'Failed to delete message and subsequent messages');
      }
    },

    async regenerateMessage (chatId: string, messageId: string) {
      const chat = findById(this.chats, chatId);
      if (!chat) return;

      try {
        const index = chat.messages.findIndex(m => m.id === messageId);
        if (index <= 0 || chat.messages[index - 1].role !== 'user') return;

        const prevMessage = chat.messages[index - 1];
        const messageIdsToDelete = chat.messages.slice(index - 1).map(m => m.id);

        chat.messages = chat.messages.slice(0, index - 1);
        chat.timestamp = Date.now();
        this.chats.sort((a, b) => b.timestamp - a.timestamp);

        await deleteMessage(chatId, messageIdsToDelete);
        await this.persistChatMeta({ id: chatId, timestamp: chat.timestamp });

        await this.sendMessage(chatId, prevMessage.content, prevMessage.attachmentContent ? {
          content: prevMessage.attachmentContent,
          type: prevMessage.attachmentMeta?.type || AttachmentType.TEXT,
          meta: prevMessage.attachmentMeta as File,
        } as Attachment : null, this.memory.getMemoryContent);
      } catch (error) {
        this.error = handleError(error, 'Failed to regenerate message');
      }
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
