<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  interface FormSettings {
    searchPrompt: string;
    searxngUrl: string;
    searchModel: string;
  }

  const formSettings = ref<FormSettings>({
    searchPrompt: settingsStore.settings.presetsPrompts.find(p => p.type === 'search')?.value || '',
    searxngUrl: settingsStore.settings.searxngUrl || '',
    searchModel: settingsStore.settings.searchModel || '',
  });

  const availableModels = computed(() => chatStore.models || []);

  const isFormValid = computed(() => {
    return (
      formSettings.value.searxngUrl.trim() !== '' &&
      /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(formSettings.value.searxngUrl)
    );
  });

  const saveSettings = () => {
    const updatedPresets = settingsStore.settings.presetsPrompts.filter(p => p.type !== 'search');
    updatedPresets.push({ type: 'search', value: formSettings.value.searchPrompt });
    settingsStore.updateSettings({
      presetsPrompts: updatedPresets,
      searxngUrl: formSettings.value.searxngUrl,
      searchModel: formSettings.value.searchModel,
    });
    showSnackbar({ message: 'Search settings saved', type: 'success' });
  };

  const resetSettings = () => {
    formSettings.value = {
      searchPrompt: '',
      searxngUrl: '',
      searchModel: '',
    };
    settingsStore.resetSettings();
    showSnackbar({ message: 'Search settings reset', type: 'success' });
  };
</script>

<template>
  <v-card-title class="text-h6 pb-2">
    Search
  </v-card-title>
  <v-card-text>
    <v-form @submit.prevent="saveSettings">
      <v-textarea
        v-model="formSettings.searchPrompt"
        class="mb-4"
        label="Search prompt"
        rows="4"
        variant="solo-filled"
      />
      <v-text-field
        v-model="formSettings.searxngUrl"
        class="mb-4"
        label="SearxNG URL"
        :rules="[v => !!v || 'URL is required', v => /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(v) || 'Invalid URL format']"
        variant="solo-filled"
      />
      <v-select
        v-model="formSettings.searchModel"
        class="mb-4"
        clearable
        :disabled="!availableModels.length"
        item-title="name"
        item-value="id"
        :items="availableModels"
        label="Model for search query"
        variant="solo-filled"
      />
    </v-form>
  </v-card-text>
  <v-card-actions>
    <v-col>
      <v-btn block color="primary" :disabled="!isFormValid" type="submit">Save</v-btn>
    </v-col>
    <v-col>
      <v-btn block color="warning" variant="solo-filled" @click="resetSettings">Reset</v-btn>
    </v-col>
  </v-card-actions>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}
</style>
