<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useMemoryStore } from '@/stores/memory';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';
  import type { MemoryEntry } from '@/types/chats.ts';
  import type { ISettings } from '@/types/settings.ts';

  const memoryStore = useMemoryStore();
  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  const newMemoryContent = ref('');
  const editingMemory = ref<MemoryEntry | null>(null);

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

  const addOrUpdateMemory = async () => {
    if (!newMemoryContent.value.trim()) {
      showSnackbar({ message: 'Memory content cannot be empty', type: 'error' });
      return;
    }
    try {
      if (editingMemory.value?.id) {
        await memoryStore.updateMemory(editingMemory.value.id, newMemoryContent.value);
        showSnackbar({ message: 'Memory updated', type: 'success' });
        editingMemory.value = null;
      } else {
        await memoryStore.addMemory(newMemoryContent.value);
        showSnackbar({ message: 'Memory added', type: 'success' });
      }
      newMemoryContent.value = '';
    } catch (error) {
      showSnackbar({ message: 'Failed to save memory', type: 'error' });
    }
  };

  const editMemory = (entry: MemoryEntry) => {
    editingMemory.value = entry;
    newMemoryContent.value = entry.content;
  };

  const deleteMemory = async (id: number) => {
    try {
      await memoryStore.deleteMemory(id);
      showSnackbar({ message: 'Memory deleted', type: 'success' });
    } catch (error) {
      showSnackbar({ message: 'Failed to delete memory', type: 'error' });
    }
  };

  const cancelEdit = () => {
    editingMemory.value = null;
    newMemoryContent.value = '';
  };

  // Fetch memory on component mount
  memoryStore.fetchMemory();
</script>

<template>
  <v-card-title class="text-h6 pb-2">
    Memory Management
  </v-card-title>
  <v-card-text>
    <v-form class="settings-form" @submit.prevent="saveSettings">
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

  <v-card-text>
    <v-divider class="my-4" />
    <h3 class="section-subtitle">Memory Chunks</h3>
    <v-form class="memory-form mb-4" @submit.prevent="addOrUpdateMemory">
      <v-textarea
        v-model="newMemoryContent"
        class="mb-4"
        label="Memory Content"
        rows="4"
        variant="solo-filled"
      />
      <v-card-actions>
        <v-col>
          <v-btn
            block
            color="primary"
            :disabled="!newMemoryContent.trim()"
            variant="flat"
          >
            {{ editingMemory ? 'Update' : 'Add' }} Memory
          </v-btn>
        </v-col>
        <v-col>
          <v-btn
            v-if="editingMemory"
            block
            variant="outlined"
            @click="cancelEdit"
          >Cancel</v-btn>
        </v-col>
      </v-card-actions>
    </v-form>

    <v-progress-linear
      v-if="memoryStore.loading"
      class="mb-4"
      color="primary"
      indeterminate
    />
    <v-list
      v-if="memoryStore.memory.length && !memoryStore.loading"
      class="memory-list"
    >
      <v-list-item
        v-for="entry in memoryStore.memory"
        :key="entry.id"
        class="memory-item"
      >
        <div class="memory-content">
          <div class="content-text">{{ entry.content }}</div>
          <div class="content-meta text-grey">
            {{ new Date(entry.createdAt).toLocaleString() }}
          </div>
        </div>
        <template #append>
          <v-btn
            color="primary"
            icon="mdi-pencil"
            variant="text"
            @click="editMemory(entry)"
          />
          <v-btn
            color="red"
            icon="mdi-delete"
            variant="text"
            @click="deleteMemory(entry.id)"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else-if="!memoryStore.loading" class="no-data">
      No memory entries available
    </div>
    <div v-if="memoryStore.error" class="error-text">
      Error: {{ memoryStore.error }}
    </div>
  </v-card-text>
</template>

<style lang="scss" scoped>
.section-title {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.section-subtitle {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.settings-form, .memory-form {
  margin-bottom: 24px;
}

.button-group {
  display: flex;
  gap: 12px;
}

.memory-list {
  background: transparent;
}

.memory-item {
  border-bottom: 1px solid rgb(var(--v-theme-on-primary));
  padding: 12px 0;
  display: flex;
  align-items: center;
}

.memory-content {
  flex: 1;
  padding-right: 16px;
}

.content-text {
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 4px;
}

.content-meta {
  font-size: 0.875rem;
  color: #666;
}

.no-data {
  text-align: center;
  color: #666;
  padding: 16px;
}

::v-deep(.v-list-item) {
  padding-inline: 0 !important;
}

::v-deep(.v-list-item__append) {
  margin-left: auto;
}

.v-card-text {
  padding: 16px;
}

.v-btn--icon {
  margin-left: 8px;
}
</style>
