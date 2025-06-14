<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useSettingsStore } from '@/stores/settings';
  import { useChatStore } from '@/stores/chat';
  import { useAlert } from '@/plugins/alertPlugin';
  import { DEFAULT_SETTINGS, type ISettings } from '@/types/settings.ts';
  import { deleteRagFile, uploadRagFiles } from '@/api/chats.ts';

  type RagSettings = Pick<ISettings, 'embeddingsModel' | 'ragFiles' | 'selectedRagFiles' | 'ragPrompt'>;

  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { showSnackbar } = useAlert();

  const formSettings = ref<RagSettings>({
    embeddingsModel: settingsStore.settings.embeddingsModel || DEFAULT_SETTINGS.embeddingsModel,
    ragFiles: settingsStore.settings.ragFiles || DEFAULT_SETTINGS.ragFiles,
    selectedRagFiles: settingsStore.settings.selectedRagFiles || DEFAULT_SETTINGS.selectedRagFiles,
    ragPrompt: settingsStore.settings.ragPrompt || DEFAULT_SETTINGS.ragPrompt,
  });

  const uploadedFiles = ref<File[]>([]);
  const isUploading = ref(false);

  const availableModels = computed(() =>
    (chatStore.models || []).map(model => ({
      name: model.name,
      details: model.details,
      size: model.size,
      value: model.name,
    }))
  );

  const connectionStatus = computed(() => chatStore.connectionStatus);

  const isFormValid = computed(() => {
    return formSettings.value.embeddingsModel !== '';
  });

  const isOllamaValid = computed(() => {
    return (
      settingsStore.settings.ollamaURL &&
      /^https?:\/\/[^\s/$.?#].[^\s]*$/.test(settingsStore.settings.ollamaURL) &&
      chatStore.connectionStatus === 'connected' &&
      chatStore.models.length > 0
    );
  });

  const fileList = computed(() => {
    return settingsStore.isLoadedRag ? formSettings.value.ragFiles : [];
  });

  const saveSettings = async () => {
    await settingsStore.updateSettings(formSettings.value);
    showSnackbar({
      message: 'RAG settings saved',
      type: 'success',
    });
  };

  const resetSettings = () => {
    formSettings.value = {
      embeddingsModel: DEFAULT_SETTINGS.embeddingsModel,
      ragFiles: [...DEFAULT_SETTINGS.ragFiles],
      selectedRagFiles: [...DEFAULT_SETTINGS.selectedRagFiles],
      ragPrompt: DEFAULT_SETTINGS.ragPrompt,
    };
    uploadedFiles.value = [];
    showSnackbar({ message: 'RAG settings reset', type: 'success' });
  };

  const handleFileUpload = (files: File | File[]) => {
    uploadedFiles.value = Array.isArray(files) ? files : files ? [files] : [];
  };

  const uploadFilesToBackend = async () => {
    if (!formSettings.value.embeddingsModel) {
      showSnackbar({ message: 'Please select an embeddings model', type: 'error' });
      return;
    }
    if (!uploadedFiles.value.length) {
      showSnackbar({ message: 'No files selected', type: 'error' });
      return;
    }
    if (!isOllamaValid.value) {
      showSnackbar({ message: 'Invalid Ollama URL or connection', type: 'error' });
      return;
    }
    try {
      isUploading.value = true;
      const uploadedFileNames = await uploadRagFiles(
        uploadedFiles.value,
        settingsStore.settings.ollamaURL,
        formSettings.value.embeddingsModel
      );
      formSettings.value.ragFiles = [...new Set([...formSettings.value.ragFiles, ...uploadedFileNames])];
      await settingsStore.updateSettings(formSettings.value);
      uploadedFiles.value = [];
      showSnackbar({ message: 'Files uploaded and processed successfully', type: 'success' });
    } catch (error) {
      showSnackbar({ message: 'Failed to upload or process files', type: 'error' });
    } finally {
      isUploading.value = false;
    }
  };

  const deleteFile = async (fileName: string) => {
    try {
      await deleteRagFile(fileName);
      formSettings.value.ragFiles = formSettings.value.ragFiles.filter(name => name !== fileName);
      formSettings.value.selectedRagFiles = formSettings.value.selectedRagFiles.filter(name => name !== fileName);
      await settingsStore.updateSettings(formSettings.value);
      showSnackbar({ message: `File "${fileName}" deleted`, type: 'success' });
    } catch (error) {
      showSnackbar({ message: `Failed to delete file "${fileName}"`, type: 'error' });
    }
  };
</script>

<template>
  <v-card-title class="text-h6 pb-2">RAG System</v-card-title>
  <v-card-text>
    <v-form @submit.prevent="saveSettings">
      <v-select
        v-model="formSettings.embeddingsModel"
        class="mb-4"
        :disabled="!availableModels.length"
        hint="Select an embeddings model (e.g., nomic-embed-text)"
        item-title="name"
        item-value="value"
        :items="availableModels"
        label="Embeddings Model"
        :loading="connectionStatus === 'checking'"
        persistent-hint
        :rules="[v => !!v || 'Embeddings model is required']"
        variant="solo-filled"
      />

      <v-textarea
        v-model="formSettings.ragPrompt"
        class="mb-4"
        label="RAG Prompt"
        rows="4"
        variant="solo-filled"
      />

      <div class="file-input-wrapper mb-4">
        <v-file-input
          v-model="uploadedFiles"
          accept=".txt,.pdf"
          :disabled="!formSettings.embeddingsModel || !isOllamaValid || isUploading"
          hide-details
          label="Upload RAG Files"
          multiple
          variant="solo-filled"
          @update:model-value="handleFileUpload"
        />
        <v-btn
          class="upload-btn"
          color="blue"
          :disabled="!formSettings.embeddingsModel || !isOllamaValid || !uploadedFiles.length || isUploading"
          icon="mdi-upload"
          :loading="isUploading"
          variant="text"
          @click="uploadFilesToBackend"
        />
      </div>

      <v-divider class="my-6" />
      <h3 class="section-subtitle">Uploaded Files</h3>

      <v-list v-if="settingsStore.isLoadedRag" class="prompt-list">
        <v-list-item v-for="(fileName, index) in fileList" :key="index" class="prompt-item">
          <div class="prompt-content">
            <div class="content-title">{{ fileName }}</div>
          </div>
          <template #append>
            <v-btn
              color="red"
              :disabled="isUploading"
              icon="mdi-delete"
              variant="text"
              @click="deleteFile(fileName)"
            />
          </template>
        </v-list-item>
      </v-list>
      <div v-else class="no-data">Loading files...</div>
      <div v-if="settingsStore.isLoadedRag && !fileList.length" class="no-data">No files uploaded</div>

      <v-card-actions>
        <v-col>
          <v-btn
            block
            color="blue"
            :disabled="!isFormValid || isUploading"
            type="submit"
            variant="flat"
            @click="saveSettings"
          >
            Save Settings
          </v-btn>
        </v-col>
        <v-col>
          <v-btn
            block
            :disabled="isUploading"
            variant="outlined"
            @click="resetSettings"
          >
            Reset Settings
          </v-btn>
        </v-col>
      </v-card-actions>
    </v-form>
  </v-card-text>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}

.section-subtitle {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.prompt-list {
  background: transparent;
}

.prompt-item {
  border-bottom: 1px solid rgb(var(--v-theme-on-primary));
  padding: 12px 0;
  display: flex;
  align-items: center;
}

.prompt-content {
  flex: 1;
  padding-right: 16px;
}

.content-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 4px;
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

.v-btn--icon {
  margin-left: 8px;
}

.file-input-wrapper {
  display: flex;
  align-items: center;
}

.upload-btn {
  margin-left: 8px;
}
</style>
