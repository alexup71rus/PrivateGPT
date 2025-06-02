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
    searxngURL: settingsStore.settings.searxngURL || '',
    searchModel: settingsStore.settings.searchModel || '',
    searchFormat: settingsStore.settings.searchFormat || 'json',
  });

  const availableModels = computed(() => [
    { name: 'General model', id: '' },
    ...(chatStore.models || []),
  ]);

  const searchFormats = [
    { name: 'JSON', id: 'json' },
    { name: 'HTML', id: 'html' },
  ];

  const isFormValid = computed(() => {
    return (
      formSettings.value.searxngURL?.trim() !== '' &&
      /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(formSettings.value.searxngURL || '') &&
      ['html', 'json'].includes(formSettings.value.searchFormat || '')
    );
  });

  const saveSettings = () => {
    settingsStore.updateSettings({
      searxngURL: formSettings.value.searxngURL,
      searchModel: formSettings.value.searchModel,
      searchFormat: formSettings.value.searchFormat,
    });
    showSnackbar({ message: 'Search settings saved', type: 'success' });
  };

  const resetSettings = () => {
    formSettings.value = {
      searxngURL: '',
      searchModel: '',
      searchFormat: 'json',
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
      <v-text-field
        v-model="formSettings.searxngURL"
        class="mb-4"
        :hint="'URL should include %s where the search query will be inserted'"
        label="SearXNG URL"
        persistent-hint
        variant="solo-filled"
      />
      <v-select
        v-model="formSettings.searchFormat"
        class="mb-4"
        item-title="name"
        item-value="id"
        :items="searchFormats"
        label="Search result format"
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
