<script lang="ts" setup>
import AlertProvider from "@/components/Providers/AlertProvider.vue";
import {useChatStore} from "@/stores/chat.ts";
import {computed, onMounted} from "vue";
import {useRoute} from "vue-router";

const route = useRoute();
const store = useChatStore();


onMounted(async () => {
  await store.fetchModels();
  store.initialize();
})

// typed router shows pages names
const isChatPage = computed(() => route.name === '/');
</script>

<template>
  <v-app>
    <AlertProvider />
    <v-main>
      <div
        class="aside"
        :class="{ 'aside--opened': store.isAsideOpen }"
      >
        <SidebarLayout :isChatPage="isChatPage" />
      </div>

      <div class="main">
        <AppHeader />
        <div
          class="content"
        >
          <router-view />
        </div>
        <AppFooter />
      </div>
    </v-main>
  </v-app>
</template>

<style lang="scss" scoped>
.v-main {
  display: flex;
}

.aside {

}

.main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
