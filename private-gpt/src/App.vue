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

onMounted(async () => {
  await chat.fetchModels();
  await chat.initialize();
});

watch(() => route.hash, async (newHash) => {
  await selectChat(newHash.replace('#', ''));
});
</script>

<template>
  <v-app>
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
</style>
