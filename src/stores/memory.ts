import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import { deleteMemoryEntry, loadMemory, saveMemory, waitForBackend } from '@/api/chats';
import { type MemoryEntry, type Message } from '@/types/chats.ts';
import type { ISettings } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';
import { extractStringFromResponse } from '@/utils/helpers.ts';

export interface MemoryState {
  http: ReturnType<typeof useHttpService>['http'];
  settings: ISettings;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  memory: MemoryEntry[];
  loading: boolean;
  error: string | null;
}

export const useMemoryStore = defineStore('memory', {
  state: (): MemoryState => {
    const { http } = useHttpService();
    const { settings } = useSettingsStore();
    return {
      http,
      settings,
      connectionStatus: 'disconnected',
      memory: [],
      loading: false,
      error: null,
    };
  },
  getters: {
    getMemoryContent: (state): string => {
      return state.memory.length
        ? 'Memory context:\n' + state.memory.map(entry => entry.content).join('\n---\n') + '\n---\n'
        : '';
    },
  },
  actions: {
    async fetchMemory () {
      this.loading = true;
      this.error = null;
      try {
        await waitForBackend();
        this.memory = await loadMemory();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch memory';
      } finally {
        this.loading = false;
      }
    },
    async addMemory (content: string) {
      this.loading = true;
      this.error = null;
      try {
        const newEntry: MemoryEntry = {
          content,
          createdAt: Date.now(),
        };
        this.memory.push(newEntry);
        const savedEntries = await saveMemory(this.memory);
        this.memory = savedEntries;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save memory';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async updateMemory (id: number, content: string) {
      this.loading = true;
      this.error = null;
      try {
        this.memory = this.memory.map(entry =>
          entry.id === id ? { ...entry, content, updatedAt: Date.now() } : entry
        );
        await saveMemory(this.memory);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update memory';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async deleteMemory (id: number) {
      this.loading = true;
      this.error = null;
      try {
        await deleteMemoryEntry(id);
        this.memory = this.memory.filter(entry => entry.id !== id);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete memory';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchSummary (recentMessages: Message[]): Promise<string | null> {
      this.loading = true;
      this.error = null;
      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaURL}/api/chat`,
          data: {
            model: this.settings.memoryModel || this.settings.selectedModel,
            messages: [
              { role: 'system', content: this.settings.memoryPrompt },
              ...recentMessages,
              { role: 'user', content: 'Summarize the key information now.' },
            ],
            stream: false,
          },
        });

        const summary = extractStringFromResponse(response?.message?.content?.trim());
        if (!summary || summary.length < 3) {
          this.error = 'Invalid or empty summary generated';
          return null;
        }
        return summary;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch summary';
        return null;
      } finally {
        this.loading = false;
      }
    },
    async saveSummary (summary: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        await this.addMemory(summary);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save summary';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async getSummary (recentMessages: Message[]): Promise<string | null> {
      this.loading = true;
      this.error = null;
      try {
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaURL}/api/chat`,
          data: {
            model: this.settings.memoryModel || this.settings.systemModel || this.settings.selectedModel,
            messages: [
              { role: 'system', content: this.settings.memoryPrompt },
              ...recentMessages,
              { role: 'user', content: 'Summarize the key information now.' },
            ],
            stream: false,
          },
        });

        const summary = extractStringFromResponse(response?.message?.content?.trim());
        if (!summary || summary.length < 3) {
          this.error = 'Invalid or empty summary generated';
          return null;
        }

        await this.addMemory(summary);
        return summary;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save summary';
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
