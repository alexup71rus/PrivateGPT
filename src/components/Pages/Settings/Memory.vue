<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';
  import type { ISettings } from '@/types/settings.ts';

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  const formSettings = ref<Partial<ISettings>>({
    memoryModel: settingsStore.settings.memoryModel || settingsStore.settings.systemModel || settingsStore.settings.selectedModel || '',
    memoryPrompt: settingsStore.settings.memoryPrompt,
  });

  const availableModels = computed(() => [
    { name: 'General model', id: '' },
    ...(chatStore.models || []),
  ]);

  const saveSettings = () => {
    settingsStore.updateSettings(formSettings.value);
    showSnackbar({ message: 'Memory settings saved', type: 'success' });
  };

  const resetSettings = () => {
    formSettings.value = {
      memoryModel: '',
      memoryPrompt: settingsStore.settings.memoryPrompt,
    };
    settingsStore.resetSettings();
    showSnackbar({ message: 'Memory settings reset', type: 'success' });
  };
</script>

<template>
  <v-card-title class="text-h6 pb-2">
    Memory
  </v-card-title>
  <v-card-text>
    <v-form @submit.prevent="saveSettings">
      <v-select
        v-model="formSettings.memoryModel"
        class="mb-4"
        item-title="name"
        item-value="id"
        :items="availableModels"
        label="Model for memory"
        variant="solo-filled"
      />
      <v-textarea
        v-model="formSettings.memoryPrompt"
        class="mb-4"
        label="Memory prompt"
        rows="4"
        variant="solo-filled"
      />
    </v-form>
  </v-card-text>
  <v-card-actions>
    <v-col>
      <v-btn
        block
        color="blue"
        type="submit"
        variant="flat"
        @click="saveSettings"
      >Save</v-btn>
    </v-col>
    <v-col>
      <v-btn block variant="flat" @click="resetSettings">Reset</v-btn>
    </v-col>
  </v-card-actions>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}
</style>
