<script lang="ts" setup>
  import AlertProvider from '@/components/Providers/AlertProvider.vue';
  import { useChatStore } from '@/stores/chat.ts';
  import { onMounted, watch } from 'vue';
  import { useAppRouting } from '@/composables/useAppRouting.ts';
  import { useAppStore } from '@/stores/app.ts';
  import { useChatActions } from '@/composables/useChatActions.ts';
  import { useRoute } from 'vue-router';

  const app = useAppStore();
  const chat = useChatStore();
  const route = useRoute();
  const { selectChat } = useChatActions();
  const { isChatPage } = useAppRouting();

  const isElectron = !!(window as any).electronAPI;

  onMounted(async () => {
    await Promise.all([chat.fetchModels(), chat.initialize()]);

    if (chat.error || !chat.chats?.length || window.location.pathname !== '/') {
      return;
    }

    const chatIdFromHash = window.location.hash.replace('#', '');
    const chats = chat.chats;

    if (!chats.length) {
      const newChatId = (await chat.createChat())?.id;
      if (newChatId) await selectChat(newChatId);
      return;
    }

    if (!chatIdFromHash) {
      await selectChat(chats[0].id);
      return;
    }

    const selectedChat = chats.find(chat => chat.id === chatIdFromHash);
    if (selectedChat) {
      await selectChat(chatIdFromHash);
    } else if (chats[chats.length - 1].messages.length === 0) {
      await selectChat(chats[chats.length - 1].id);
    } else {
      const newChatId = (await chat.createChat())?.id;
      if (newChatId) await selectChat(newChatId);
    }
  });

  watch(
    () => route.hash,
    async newHash => {
      if (newHash) {
        await selectChat(newHash.replace('#', ''));
      }
    }
  );

  const minimizeWindow = () => {
    (window as any).electronAPI.minimizeWindow();
  };

  const maximizeWindow = () => {
    (window as any).electronAPI.maximizeWindow();
  };

  const closeWindow = () => {
    (window as any).electronAPI.closeWindow();
  };
</script>

<template>
  <v-app :class="{ electron: isElectron }">
    <v-app-bar
      v-if="isElectron"
      app
      dark
      density="compact"
      flat
    >
      <v-toolbar-title>PrivateGPT</v-toolbar-title>
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

/* Для перетаскивания окна */
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
