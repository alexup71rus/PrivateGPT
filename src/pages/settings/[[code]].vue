<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

  const componentMap = {
    general: defineAsyncComponent(() => import('../../components/Pages/Settings/General.vue')),
    search: defineAsyncComponent(() => import('../../components/Pages/Settings/Search.vue')),
    memory: defineAsyncComponent(() => import('../../components/Pages/Settings/Memory.vue')),
    rag: defineAsyncComponent(() => import('../../components/Pages/Settings/Rag.vue')),
    schedule: defineAsyncComponent(() => import('../../components/Pages/Settings/Schedule.vue')),
  } as const;

  const settingsComponent = computed(() => {
    const code = route.params.code as keyof typeof componentMap;
    return componentMap[code] || componentMap.general;
  });
</script>

<template>
  <div class="settings-wrapper">
    <v-card class="settings-card" elevation="3" max-width="600">
      <v-card-text>
        <component :is="settingsComponent" />
      </v-card-text>
    </v-card>
  </div>
</template>

<style lang="scss" scoped>
.settings-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--padding-body);
}

.settings-card {
  width: 100%;
  max-height: calc(100vh - 32px);
  overflow: auto;
}

::v-global(.electron .settings-card) {
  max-height: calc(100vh - 70px);
}

::v-deep(.v-card-title) {
  position: sticky;
  top: 0;
  padding: 16px;
  background: rgba(var(--v-theme-surface-rgba), .8);
  backdrop-filter: blur(5px);
  z-index: 1;
  overflow: visible;

  &::before {
    content: '';
    width: 100%;
    height: 20px;
    pointer-events: none;
    background-image: linear-gradient(to bottom, rgba(var(--v-theme-surface-rgba), 0.5), transparent);
    position: absolute;
    bottom: -20px;
    left: 0;
    z-index: 2;
  }
}

::v-deep(.v-card-actions) {
  position: sticky;
  bottom: 0;
  padding: 0;
  background: rgba(var(--v-theme-surface-rgba), .8);
  backdrop-filter: blur(5px);
  z-index: 1;
  overflow: visible;

  &::before {
    content: '';
    width: 100%;
    height: 20px;
    pointer-events: none;
    background-image: linear-gradient(to top, rgba(var(--v-theme-surface-rgba), 0.5), transparent);
    position: absolute;
    top: -20px;
    left: 0;
  }
}
</style>
