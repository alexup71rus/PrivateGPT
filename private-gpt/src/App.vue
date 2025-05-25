<script lang="ts" setup>
import AlertProvider from "@/components/Providers/AlertProvider.vue";
import {useChatStore} from "@/stores/chat.ts";
import {onMounted} from "vue";
import {useAppRouting} from "@/composables/useAppRouting.ts";
import {useAppStore} from "@/stores/app.ts";

const app = useAppStore();
const chat = useChatStore();
const { isChatPage } = useAppRouting();

onMounted(async () => {
  await chat.fetchModels();
  chat.initialize();
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
