import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import type { ISettings } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';

export const useAppStore = defineStore('app', {
  state: () => {
    const { http } = useHttpService();
    return {
      http,
      isAsideOpen: true,
    };
  },
  getters: {
    settings: () => useSettingsStore().settings as ISettings,
  },
  actions: {
    async init() {
      const settingsStore = useSettingsStore();
      await settingsStore.init();
      this.isAsideOpen = settingsStore.settings.isAsideOpen ?? false;
    },
    setAside(value: boolean) {
      this.isAsideOpen = value;
      useSettingsStore().updateSettings({ isAsideOpen: value });
    },
  },
})
