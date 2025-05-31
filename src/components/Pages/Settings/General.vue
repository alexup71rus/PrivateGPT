<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  interface FormSettings {
    theme: 'light' | 'dark';
    ollamaLink: string;
    systemModel: string;
    titlePrompt: string;
    defaultChatTitle: string;
  }

  const formSettings = ref<FormSettings>({
    theme: settingsStore.settings.theme,
    ollamaLink: settingsStore.settings.ollamaLink,
    systemModel: settingsStore.settings.systemModel,
    titlePrompt: settingsStore.settings.titlePrompt,
    defaultChatTitle: settingsStore.settings.defaultChatTitle,
  });

  const availableModels = computed(() => chatStore.models || []);

  const isFormValid = computed(() => {
    return (
      formSettings.value.ollamaLink.trim() !== '' &&
      /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(formSettings.value.ollamaLink) &&
      formSettings.value.defaultChatTitle.trim() !== ''
    );
  });

  const saveSettings = () => {
    console.log('saveSettings');
    settingsStore.updateSettings(formSettings.value);
    showSnackbar({ message: 'General settings saved', type: 'success' });
  };

  const resetSettings = () => {
    formSettings.value = {
      theme: 'dark',
      ollamaLink: 'http://localhost:11434',
      systemModel: 'llama3.2:latest',
      titlePrompt: settingsStore.settings.titlePrompt,
      defaultChatTitle: 'New chat',
    };
    settingsStore.resetSettings();
    showSnackbar({ message: 'General settings reset', type: 'success' });
  };
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
        :items="[{ title: 'Light', value: 'light' }, { title: 'Dark', value: 'dark' }]"
        label="Theme"
        variant="solo-filled"
      />
      <v-text-field
        v-model="formSettings.ollamaLink"
        class="mb-4"
        label="Ollama URL"
        :rules="[v => !!v || 'URL is required', v => /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(v) || 'Invalid URL format']"
        variant="solo-filled"
      />
      <v-select
        v-model="formSettings.systemModel"
        class="mb-4"
        :disabled="!availableModels.length"
        item-title="name"
        item-value="id"
        :items="availableModels"
        label="Model for titles"
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
        color="primary"
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
