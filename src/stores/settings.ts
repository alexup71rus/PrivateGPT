import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { DEFAULT_SETTINGS, type ISettings } from '@/types/settings.ts';
import { getRagFiles } from '@/api/chats.ts';

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const saved = localStorage.getItem('plamaSettings');
    const parsed = saved ? JSON.parse(saved) : {};

    if (!parsed.systemPrompts || !Array.isArray(parsed.systemPrompts)) {
      parsed.systemPrompts = DEFAULT_SETTINGS.systemPrompts;
    }

    const settings: ISettings = reactive({ ...DEFAULT_SETTINGS, ...parsed });
    const isLoadedRag = ref(false);

    return {
      settings,
      systemThemeDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      isLoadedRag,
    };
  },
  getters: {
    isDarkTheme: state => {
      if (state.settings.theme === 'system') {
        return state.systemThemeDark;
      }
      return state.settings.theme === 'dark';
    },
  },
  actions: {
    async init () {
      await this.loadRagFiles();
      this.initThemeListener();
    },
    initThemeListener () {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        this.systemThemeDark = e.matches;
      };
      mediaQuery.addEventListener('change', handler);

      return () => mediaQuery.removeEventListener('change', handler);
    },
    async loadRagFiles () {
      try {
        const files = await getRagFiles();
        this.settings.ragFiles = files;
        this.settings.selectedRagFiles = this.settings.selectedRagFiles.filter(file =>
          files.includes(file)
        );
        this.isLoadedRag = true;
      } catch (error) {
        console.error('Failed to load RAG files:', error);
      }
    },
    updateSettings (updates: Partial<ISettings>) {
      Object.assign(this.settings, updates);
      try {
        localStorage.setItem('plamaSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
    resetSettings () {
      Object.assign(this.settings, { ...DEFAULT_SETTINGS });
      try {
        localStorage.setItem('plamaSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
  },
});
