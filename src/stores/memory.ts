import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import { loadMemory, saveMemory, waitForBackend } from '@/api/chats';
import { type MemoryEntry, type Message } from '@/types/chats.ts';
import type { ISettings } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';

export const useMemoryStore = defineStore('memory', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useSettingsStore();

    return {
      http,
      settings: settings as ISettings,
      connectionStatus: 'disconnected' as 'connected' | 'disconnected' | 'checking',
      memory: [] as MemoryEntry[],
      loading: false,
      error: null as string | null,
    };
  },
  getters: {
    getMemoryContent (state): string {
      return state.memory.length > 0
        ? 'Memory context:\n' + this.memory.map(entry => entry.content).join('\n---\n') + '\n---\n'
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
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async addMemory (content: string) {
      try {
        this.loading = true;
        this.memory = [...(this.memory || []), { content, timestamp: Date.now() }];
        await saveMemory(this.memory);

      } catch (error) {
        console.error(`Error saving summary:`, error);
        this.error = error instanceof Error ? error.message : 'Failed to save summary';
        return null;
      } finally {
        this.loading = false;
      }
    },
    async saveSummary (recentMessages: Message[]): Promise<string | null> {
      try {
        this.loading = true;
        const response = await this.http.request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          url: `${this.settings.ollamaURL}/api/chat`,
          data: {
            model: this.settings.memoryModel || this.settings.systemModel || this.settings.selectedModel,
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
                  items: { type: 'string' },
                },
              },
              required: ['facts'],
            },
          },
        });

        let facts: string[] = [];
        try {
          facts = JSON.parse(response?.message?.content)?.facts || [];
        } catch (parseError) {
          console.error(`Failed to parse API response for chat:`, parseError);
          return null;
        }

        if (!Array.isArray(facts) || facts.length === 0) {
          console.warn(`Empty or invalid facts received for chat`);
          return null;
        }

        const summary = facts.join('. ') + '.';
        const newEntry: MemoryEntry = {
          content: summary,
          timestamp: Date.now(),
        };

        this.memory = [...(this.memory || []), newEntry];
        await saveMemory(this.memory);

        return summary;
      } catch (error) {
        console.error(`Error saving summary for chat:`, error);
        this.error = error instanceof Error ? error.message : 'Failed to save summary';
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
