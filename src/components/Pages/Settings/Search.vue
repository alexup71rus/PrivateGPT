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
    searchPrompt: settingsStore.settings.searchPrompt || '',
    searchResultsLimit: settingsStore.settings.searchResultsLimit || 3,
    followSearchLinks: settingsStore.settings.followSearchLinks || false,
  });

  const availableModels = computed(() => [
    { name: 'Use selected model', id: '' },
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
      ['html', 'json'].includes(formSettings.value.searchFormat || '') &&
      formSettings.value.searchPrompt?.trim() !== '' &&
      (formSettings.value.searchResultsLimit || 0) >= 1 &&
      (formSettings.value.searchResultsLimit || 0) <= 10
    );
  });

  const saveSettings = () => {
    settingsStore.updateSettings({
      searxngURL: formSettings.value.searxngURL,
      searchModel: formSettings.value.searchModel,
      searchFormat: formSettings.value.searchFormat,
      searchPrompt: formSettings.value.searchPrompt,
      searchResultsLimit: formSettings.value.searchResultsLimit,
      followSearchLinks: formSettings.value.followSearchLinks,
    });
    showSnackbar({ message: 'Search settings saved', type: 'success' });
  };

  const resetSettings = () => {
    formSettings.value = {
      searxngURL: '',
      searchModel: '',
      searchFormat: 'json',
      searchPrompt: settingsStore.settings.searchPrompt,
      searchResultsLimit: 3,
      followSearchLinks: false,
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
      <v-textarea
        v-model="formSettings.searchPrompt"
        class="mb-4"
        :hint="'Prompt to formulate search queries'"
        label="Search prompt"
        persistent-hint
        rows="4"
        variant="solo-filled"
      />
      <v-text-field
        v-model.number="formSettings.searchResultsLimit"
        class="mb-4"
        :hint="'Number of search results to retrieve (1-100)'"
        label="Total search results"
        persistent-hint
        :rules="[v => (v >= 1 && v <= 100) || 'Must be between 1 and 100']"
        type="number"
        variant="solo-filled"
      />
      <v-checkbox
        v-model="formSettings.followSearchLinks"
        class="mb-4"
        color="primary"
        :hint="'Enable to automatically follow links for more details'"
        label="Follow links in search results"
        persistent-hint
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
