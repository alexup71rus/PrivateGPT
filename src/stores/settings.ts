import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { getRagFiles } from '@/api/chats.ts';
import { loadSettings, resetSettings, saveSettings } from '@/api/settings.ts';
import { DEFAULT_SETTINGS, type ISettings } from '../types/settings.ts';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: reactive({ ...DEFAULT_SETTINGS }),
    systemThemeDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    isLoadedRag: ref(false),
  }),
  getters: {
    isAsideOpen: state => {
      return state.settings.isAsideOpen
    },
    isDarkTheme: state => {
      // TODO: light theme
      // if (state.settings.theme === 'system') {
      //   return state.systemThemeDark;
      // }
      // return state.settings.theme === 'dark';

      return true;
    },
  },
  actions: {
    async init() {
      const loaded = await loadSettings();
      if (loaded) {
        Object.assign(this.settings, loaded);
      }
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
    updateSettings(updates: Partial<ISettings>) {
      Object.assign(this.settings, updates);
      saveSettings(this.settings);
    },
    resetSettings() {
      Object.assign(this.settings, { ...DEFAULT_SETTINGS });
      resetSettings();
    },
  },
});
