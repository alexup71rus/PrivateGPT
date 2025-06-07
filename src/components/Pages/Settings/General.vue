<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';
  import { DEFAULT_SETTINGS, type ISettings } from '@/types/settings.ts';

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  const formSettings = ref<Partial<ISettings>>({
    theme: settingsStore.settings.theme,
    ollamaURL: settingsStore.settings.ollamaURL,
    systemModel: settingsStore.settings.systemModel,
    titlePrompt: settingsStore.settings.titlePrompt,
    defaultChatTitle: settingsStore.settings.defaultChatTitle,
    chatScrollMode: settingsStore.settings.chatScrollMode || 'scroll',
  });

  const availableModels = computed(() => [
    { name: 'Use selected model', id: '' },
    ...(chatStore.models || []).map(model => ({ name: model.name, id: model.id })),
  ]);
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
      theme: DEFAULT_SETTINGS.theme,
      ollamaURL: DEFAULT_SETTINGS.ollamaURL,
      systemModel: DEFAULT_SETTINGS.systemModel,
      titlePrompt: DEFAULT_SETTINGS.titlePrompt,
      defaultChatTitle: DEFAULT_SETTINGS.defaultChatTitle,
      chatScrollMode: DEFAULT_SETTINGS.chatScrollMode || 'scroll',
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

      <v-select
        v-model="formSettings.chatScrollMode"
        class="mb-4"
        :items="[{ title: 'Gap', value: 'gap' }, { title: 'Scroll', value: 'scroll' }]"
        label="Chat Scroll Mode"
        variant="solo-filled"
      />

      <v-divider class="mb-10" />

      <v-text-field
        v-model="formSettings.ollamaURL"
        class="mb-4"
        hint="For example: http://localhost:11434"
        label="Ollama URL"
        persistent-hint
        :rules="[v => !!v || 'URL is required', v => /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(v) || 'Invalid URL format. Did you try http://localhost:11434?']"
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
        label="General model (for features)"
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
      >Save Settings</v-btn>
    </v-col>
    <v-col>
      <v-btn
        block
        variant="outlined"
        @click="resetSettings"
      >Reset Settings</v-btn>
    </v-col>
  </v-card-actions>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}
</style>
