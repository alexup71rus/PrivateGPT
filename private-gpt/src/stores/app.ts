import {defineStore} from 'pinia';
import {useHttpService} from "@/plugins/httpPlugin";
import {useAppSettings} from "@/composables/useAppSettings.ts";
import type {ISettings} from "@/types/settings.ts";
import {loadChats} from "@/utils/storage.ts";

export const useAppStore = defineStore('app', {
  state: () => {
    const { http } = useHttpService();
    const { settings } = useAppSettings();

    return {
      http,
      settings: settings as ISettings,
      isAsideOpen: false,
      chats: loadChats(),
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
