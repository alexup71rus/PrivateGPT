import {defineStore} from 'pinia';
import {useHttpService} from "@/plugins/httpPlugin";
import {useAppSettings} from "@/composables/useAppSettings.ts";
import type {ISettings} from "@/types/settings.ts";

export const useAppStore = defineStore('app', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useAppSettings();

    return {
      http,
      settings: settings as ISettings,
      isAsideOpen: false,
    };
  },
  getters: {
  },
  actions: {
    setAside(value: boolean) {
      this.isAsideOpen = value;
    },
  },
})
