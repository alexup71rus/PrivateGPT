<script lang="ts" setup>
import AlertProvider from "@/components/Providers/AlertProvider.vue";
import {useChatStore} from "@/stores/chat.ts";
import {onMounted, watch} from "vue";
import {useAppRouting} from "@/composables/useAppRouting.ts";
import {useAppStore} from "@/stores/app.ts";
import {useChatActions} from "@/composables/useChatActions.ts";
import {useRoute} from "vue-router";

const app = useAppStore();
const chat = useChatStore();
const route = useRoute();
const { selectChat } = useChatActions();
const { isChatPage } = useAppRouting();

const isElectron = !!(window as any).electronAPI;

onMounted(async () => {
  await chat.fetchModels();
  await chat.initialize();

  const hash = window.location.hash.replace('#', '');
  if (chat.chats.length === 0) {
    const newChatId = (await chat.createChat())?.id;
    if (newChatId) await selectChat(newChatId);
  } else if (!hash) {
    await selectChat(chat.chats[0].id);
  } else {
    await selectChat(hash);
  }
});

watch(
  () => route.hash,
  async (newHash) => {
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
  <v-app>
    <v-app-bar v-if="isElectron" app flat dark density="compact">
      <v-toolbar-title>PrivateGPT</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon size="small" @click="minimizeWindow">
        <v-icon>mdi-window-minimize</v-icon>
      </v-btn>
      <v-btn icon size="small" @click="maximizeWindow">
        <v-icon>mdi-window-maximize</v-icon>
      </v-btn>
      <v-btn icon size="small" color="red" @click="closeWindow">
        <v-icon>mdi-window-close</v-icon>
      </v-btn>
    </v-app-bar>
    <AlertProvider />
    <v-main>
      <div
        :class="{ 'sidebar--opened': app.isAsideOpen }"
        class="sidebar"
      >
        <SidebarLayout :isChatPage="isChatPage" />
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
