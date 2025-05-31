import { defineStore } from 'pinia';
import { useHttpService } from '@/plugins/httpPlugin';
import type { ISettings } from '@/types/settings.ts';
import { useSettingsStore } from '@/stores/settings.ts';

export const useAppStore = defineStore('app', {
  state: () => {
    const { http } = useHttpService();
    const { settings, updateSettings } = useSettingsStore();

    return {
      http,
      settings: settings as ISettings,
      isAsideOpen: settings.isAsideOpen ?? false,
      updateSettings,
    };
  },
  getters: {
  },
  actions: {
    setAside (value: boolean) {
      this.isAsideOpen = value;
      this.updateSettings({
        isAsideOpen: value,
      });
    },
  },
})
