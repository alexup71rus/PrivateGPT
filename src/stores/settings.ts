import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { DEFAULT_SETTINGS, type ISettings } from '@/types/settings.ts';

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const saved = localStorage.getItem('privateGPTSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    const settings: ISettings = reactive({ ...DEFAULT_SETTINGS, ...parsed });

    return {
      settings,
    };
  },
  getters: {
    isDarkTheme: state => computed(() => state.settings.theme === 'dark'),
  },
  actions: {
    updateSettings (updates: Partial<ISettings>) {
      Object.assign(this.settings, updates);
      try {
        localStorage.setItem('privateGPTSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
    resetSettings () {
      Object.assign(this.settings, { ...DEFAULT_SETTINGS });
      try {
        localStorage.setItem('privateGPTSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
  },
});
