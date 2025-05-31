import { defineStore } from 'pinia';
import { clearAllChats, deleteChat, loadChats, loadMemory, saveChat, saveMemory } from '@/api/chats';
import type { Chat, MemoryEntry } from '@/types/chats';

export const useGraphQLStore = defineStore('graphql', {
  state: () => ({
    chats: [] as Chat[],
    memory: [] as MemoryEntry[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchChats () {
      this.loading = true;
      this.error = null;
      try {
        this.chats = await loadChats();
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async saveChat (chat: Chat) {
      this.loading = true;
      this.error = null;
      try {
        await saveChat(chat);
        // await this.fetchChats(); // Refresh chats
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async deleteChat (chatId: string) {
      this.loading = true;
      this.error = null;
      try {
        await deleteChat(chatId);
        await this.fetchChats(); // Refresh chats
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async clearChats () {
      this.loading = true;
      this.error = null;
      try {
        await clearAllChats();
        this.chats = []; // Clear local state
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchMemory () {
      this.loading = true;
      this.error = null;
      try {
        this.memory = await loadMemory();
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async saveMemory (memory: MemoryEntry[]) {
      this.loading = true;
      this.error = null;
      try {
        await saveMemory(memory);
        await this.fetchMemory(); // Refresh memory
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
