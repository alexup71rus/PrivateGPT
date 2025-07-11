<script lang="ts" setup>
import AlertProvider from '@/components/Providers/AlertProvider.vue';
import { useChatStore } from '@/stores/chat.ts';
import { nextTick, onMounted, ref } from 'vue';
import { useAppRouting } from '@/composables/useAppRouting.ts';
import { useAppStore } from '@/stores/app.ts';
import { useChatActions } from '@/composables/useChatActions.ts';
import { useSettingsStore } from '@/stores/settings.ts';
import { useMemoryStore } from '@/stores/memory.ts';
import { waitForBackend } from '@/api/chats.ts';
import { notificationService } from '@/services/notificationService';

const settingsStore = useSettingsStore();
const app = useAppStore();
const chat = useChatStore();
const memory = useMemoryStore();
const { isChatPage } = useAppRouting();
const { initFromHash } = useChatActions();

const isElectron = !!(window as any).electronAPI;
const isLoaded = ref(false);

onMounted(async () => {
  await settingsStore.init();

  // Proceed with other async operations
  await Promise.all([
    chat.checkOllamaConnection(),
    waitForBackend(),
    chat.fetchModels(),
    memory.fetchMemory(),
  ]);

  notificationService.start();

  if (chat.error || window.location.pathname !== '/') {
    isLoaded.value = true;
    return;
  }

  await chat.fetchChats();
  await nextTick();
  await initFromHash();
  if (chat.activeChatId) {
    await chat.fetchChatMessages(chat.activeChatId);
  }
  await nextTick();
  isLoaded.value = true;
});

const minimizeWindow = () => {
  (window as any).electronAPI.minimizeWindow();
};

const maximizeWindow = () => {
  (window as any).electronAPI.maximizeWindow();
};

const closeWindow = () => {
  (window as any).electronAPI.closeWindow();
};


// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js').then(() => {
//     if (Notification.permission !== 'granted') {
//       Notification.requestPermission();
//     }
//   }).catch(error => {
//     console.error('Ошибка регистрации Service Worker:', error);
//     showSnackbar({ message: 'Не удалось зарегистрировать Service Worker', type: 'error' });
//   });
// }
</script>

<template>
  <v-app v-if="isLoaded" :class="{ electron: isElectron }">
    <v-app-bar
      v-if="isElectron"
      app
      :dark="settingsStore.isDarkTheme"
      density="compact"
      flat
    >
      <v-toolbar-title>Plama</v-toolbar-title>
      <v-spacer />
      <v-btn icon size="small" @click="minimizeWindow">
        <v-icon>mdi-window-minimize</v-icon>
      </v-btn>
      <v-btn icon size="small" @click="maximizeWindow">
        <v-icon>mdi-window-maximize</v-icon>
      </v-btn>
      <v-btn color="red" icon size="small" @click="closeWindow">
        <v-icon>mdi-window-close</v-icon>
      </v-btn>
    </v-app-bar>
    <AlertProvider />
    <v-main>
      <div
        class="sidebar"
        :class="{ 'sidebar--opened': app.isAsideOpen }"
      >
        <SidebarLayout :is-chat-page="isChatPage" />
      </div>

      <div class="main">
        <div class="content">
          <router-view />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style lang="scss" scoped>
.v-main {
  display: flex;
}

.main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: var(--main-height);
}

.content {
  display: flex;
  flex-direction: column;
  height: var(--main-height);
}

.v-app-bar {
  -webkit-app-region: drag;
}

.v-btn {
  -webkit-app-region: no-drag;
}

.v-toolbar-title {
  font-size: 16px;
}
</style>
