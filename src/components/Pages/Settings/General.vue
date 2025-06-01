<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';
  import type { ISettings } from '@/types/settings.ts';

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  const formSettings = ref<Partial<ISettings>>({
    theme: settingsStore.settings.theme,
    ollamaURL: settingsStore.settings.ollamaURL,
    systemModel: settingsStore.settings.systemModel,
    titlePrompt: settingsStore.settings.titlePrompt,
    defaultChatTitle: settingsStore.settings.defaultChatTitle,
  });

  const availableModels = computed(() => chatStore.models || []);
  const connectionStatus = computed(() => chatStore.connectionStatus);

  const isFormValid = computed(() => {
    return (
      formSettings.value.ollamaURL?.trim() !== '' &&
      /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(formSettings.value.ollamaURL || '') &&
      formSettings.value.defaultChatTitle?.trim() !== ''
    );
  });

  const saveSettings = async () => {
    await settingsStore.updateSettings(formSettings.value);
    const isConnected = await chatStore.checkOllamaConnection();

    showSnackbar({
      message: isConnected
        ? 'Settings saved. Connection successful'
        : 'Settings saved but connection failed',
      type: isConnected ? 'success' : 'error',
    });
  };

  const resetSettings = () => {
    formSettings.value = {
      theme: 'system',
      ollamaURL: 'http://localhost:11434',
      systemModel: 'llama3.2:latest',
      titlePrompt: settingsStore.settings.titlePrompt,
      defaultChatTitle: 'New chat',
    };
    settingsStore.resetSettings();
    showSnackbar({ message: 'General settings reset', type: 'success' });
  };

  watch(() => formSettings.value.ollamaURL, async newUrl => {
    if (newUrl && /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(newUrl)) {
      await chatStore.checkOllamaConnection();
    }
  }, { immediate: true });
</script>

<template>
  <v-card-title class="text-h6 pb-2">
    General
  </v-card-title>
  <v-card-text>
    <v-form @submit.prevent="saveSettings">
      <v-select
        v-model="formSettings.theme"
        class="mb-4"
        :items="[{ title: 'Light', value: 'light' }, { title: 'Dark', value: 'dark' }, { title: 'System', value: 'system' }]"
        label="Theme"
        variant="solo-filled"
      />
      <v-text-field
        v-model="formSettings.ollamaURL"
        class="mb-4"
        label="Ollama URL"
        :rules="[v => !!v || 'URL is required', v => /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(v) || 'Invalid URL format']"
        variant="solo-filled"
      >
        <template #append>
          <v-icon
            :color="connectionStatus === 'connected' ? 'success' : connectionStatus === 'checking' ? 'warning' : 'error'"
          >
            mdi-circle
          </v-icon>
        </template>
      </v-text-field>
      <v-select
        v-model="formSettings.systemModel"
        class="mb-4"
        :disabled="!availableModels.length"
        item-title="name"
        item-value="id"
        :items="availableModels"
        label="General model"
        :loading="connectionStatus === 'checking'"
        variant="solo-filled"
      />
      <v-textarea
        v-model="formSettings.titlePrompt"
        class="mb-4"
        label="Title prompt"
        rows="4"
        variant="solo-filled"
      />
      <v-text-field
        v-model="formSettings.defaultChatTitle"
        class="mb-4"
        label="Default chat title"
        :rules="[v => !!v || 'Title is required']"
        variant="solo-filled"
      />
    </v-form>
  </v-card-text>
  <v-card-actions>
    <v-col>
      <v-btn
        block
        color="blue"
        :disabled="!isFormValid"
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
