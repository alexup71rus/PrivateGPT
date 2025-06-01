<script lang="ts" setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { useChatStore } from '@/stores/chat.ts';
  import { type Attachment, type AttachmentMeta, AttachmentType, type ChatModel } from '@/types/chats.ts';
  import { useSettingsStore } from '@/stores/settings.ts';
  import { useMemoryStore } from '@/stores/memory.ts';

  const chat = useChatStore();
  const { settings, updateSettings } = useSettingsStore();
  const memory = useMemoryStore();
  const textareaRef = ref<HTMLTextAreaElement>();
  const fileInputRef = ref<HTMLInputElement>();
  const activeChat = computed(() => chat.activeChat);
  const activeChatId = computed(() => chat.activeChatId);
  const messageText = ref('');
  const attachment = ref<File | null>(null);
  const attachmentContent = ref<{ content: string, type: AttachmentType, meta: AttachmentMeta } | null>(null);
  const isSearch = ref(settings.isSearchAsDefault);
  const canSend = computed(() => chat.isSending ? false : messageText.value.trim());

  const modelNames = computed(() => chat.models?.map((model: ChatModel) => model.name) || []);
  const selectedModel = ref(settings.selectedModel || settings.defaultModel || settings.systemModel);
  const isChangedModel = computed(() => settings.defaultModel ? selectedModel.value !== settings.defaultModel : selectedModel.value !== settings.systemModel);
  const modelSearch = ref('');
  const filteredModels = computed(() =>
    modelSearch.value
      ? modelNames.value.filter(name =>
        name.toLowerCase().includes(modelSearch.value.toLowerCase()))
      : modelNames.value
  );

  const setDefaultModel = () => {
    if (selectedModel.value) {
      updateSettings({ defaultModel: selectedModel.value });
    }
  };

  function selectModel (model: string) {
    selectedModel.value = model;
    updateSettings({ selectedModel: selectedModel.value });
  }

  function handleAttachClick () {
    fileInputRef.value?.click();
  }

  function handleFilesSelected (event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const isImage = /\.(png|jpe?g)$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;

      if (isImage) {
        const img = new Image();
        img.src = result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxWidth = 1024;
          const maxHeight = 768;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          const compressedBase64 = base64.split(',')[1];

          attachmentContent.value = {
            content: compressedBase64,
            type: AttachmentType.IMAGE,
            meta: {
              name: file.name,
              size: file.size,
              type: AttachmentType.IMAGE,
              lastModified: file.lastModified,
            },
          };
        };
      } else {
        attachmentContent.value = {
          content: result,
          type: AttachmentType.TEXT,
          meta: {
            name: file.name,
            size: file.size,
            type: AttachmentType.TEXT,
            lastModified: file.lastModified,
          },
        };
      }

      attachment.value = file;
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }

    input.value = '';
  }

  function removeAttachment () {
    attachment.value = null;
    attachmentContent.value = null;
    nextTick(() => textareaRef.value?.focus());
  }

  function onFormSubmit (event: Event) {
    event.preventDefault();
    sendMessage();
  }

  async function sendMessage () {
    if (!canSend.value) return;

    chat.setIsSending(true);
    try {
      await chat.sendMessage(activeChatId.value, messageText.value, { ...attachmentContent.value } as Attachment, memory.getMemoryContent);
      messageText.value = '';
      attachment.value = null;
      attachmentContent.value = null;
    } finally {
      chat.setIsSending(false);
    }
  }

  async function stopGeneration () {
    if (chat.abortController) {
      chat.abortController.abort();
      chat.setIsSending(false);

      const lastMessage = activeChat.value?.messages[activeChat.value.messages.length - 1];
      if (lastMessage?.isLoading) {
        await chat.updateMessage(activeChatId.value, lastMessage.id, lastMessage.content, false, lastMessage.thinkTime, false);
        chat.setIsSending(false);
      }
    }
  }

  onMounted(() => {
    nextTick(() => textareaRef.value?.focus());
  });

  watch(() => [chat.activeChatId, chat.isSending, chat.selectedModel], () => {
    nextTick(() => textareaRef.value?.focus());
  }, { deep: true })
</script>

<template>
  <div class="chat-input-wrapper">
    <input
      ref="fileInputRef"
      hidden
      type="file"
      @change="handleFilesSelected"
    >

    <div class="chat-input-container">
      <v-textarea
        ref="textareaRef"
        v-model="messageText"
        auto-grow
        class="chat-input"
        density="comfortable"
        :disabled="chat.isSending || chat.models?.length === 0"
        hide-details
        placeholder="Enter a message..."
        rows="1"
        variant="solo-filled"
        @keydown.enter.exact.prevent.stop
        @keyup.enter.exact.prevent.stop="onFormSubmit"
      />
    </div>

    <div class="chat-input-actions">
      <v-menu :close-on-content-click="false" location="top">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            append-icon="mdi-chevron-down"
            class="model-btn"
            :color="isChangedModel ? 'primary' : 'white'"
            prepend-icon="mdi-robot"
            variant="tonal"
          >
            {{ selectedModel || 'Model' }}
          </v-btn>
        </template>

        <v-card min-width="300">
          <v-card-text class="pa-2">
            <div class="autocomplete-model__list">
              <template v-if="chat.models?.length">
                <v-list-item
                  v-for="model in filteredModels"
                  :key="model"
                  :active="model === selectedModel"
                  :value="model"
                  @click="selectModel(model)"
                >
                  <div class="autocomplete-model__item" :title="model">
                    {{ model }}
                    <v-btn
                      v-if="isChangedModel && selectedModel === model"
                      v-tooltip:top="'Set as default'"
                      color="primary"
                      density="compact"
                      icon="mdi-check-circle"
                      variant="text"
                      @click="setDefaultModel"
                    />
                  </div>
                </v-list-item>
              </template>
              <v-skeleton-loader v-else :elevation="3" type="paragraph" />
            </div>

            <v-text-field
              v-model="modelSearch"
              class="mb-2"
              clearable
              dense
              hide-details
              placeholder="Filter models"
              variant="solo-filled"
            />
          </v-card-text>
        </v-card>
      </v-menu>
      <v-btn
        v-if="isChangedModel"
        class="model-btn"
        :color="'red'"
        icon="mdi-backup-restore"
        variant="tonal"
        @click="selectModel(settings.defaultModel)"
      />
      <v-spacer />
      <v-btn
        class="file-btn"
        :color="attachment ? 'blue' : 'white'"
        :disabled="!chat.models?.length"
        variant="tonal"
        @click="handleAttachClick"
      >
        <template #prepend>
          <v-icon>mdi-paperclip</v-icon>
        </template>
        <span v-if="attachment" v-tooltip:top="attachment.name">{{ attachment.name }}</span>
        <span v-else>Attach</span>
        <v-btn
          v-if="attachment"
          icon="mdi-close"
          size="small"
          variant="text"
          @click.stop="removeAttachment"
        />
      </v-btn>
      <v-btn
        class="search-btn"
        :color="isSearch ? 'blue' : 'white'"
        :disabled="!chat.models?.length"
        prepend-icon="mdi-magnify"
        variant="tonal"
        @click="isSearch = !isSearch"
      >
        Search
      </v-btn>
      <v-btn
        class="send-btn"
        :color="chat.isSending ? 'error' : undefined"
        :disabled="chat.isSending || chat.models?.length ? false : !canSend"
        :icon="chat.isSending ? 'mdi-stop' : 'mdi-send'"
        size="small"
        variant="text"
        @click="chat.isSending ? stopGeneration() : onFormSubmit($event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-input-wrapper {
  padding: var(--padding-body);
  background-color: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 30px;
}

.chat-input-container {
  ::v-deep(.v-field) {
    --v-shadow-key-umbra-opacity: 0;
    border-radius: 20px;
  }
}

.chat-input {
  max-height: 200px;
  overflow: auto;
}

.chat-input-actions {
  display: flex;
  gap: 8px;

  .file-btn {
    max-width: 200px;
    overflow: hidden;

    ::v-deep(.v-btn__content) {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .v-btn {
    --v-btn-height: 32px;

    text-transform: none;
    font-weight: normal;
    letter-spacing: normal;
    border-radius: 9999px;
    padding: 0 10px 0 10px;
  }

  .v-btn--icon.v-btn--density-default {
    width: var(--v-btn-height);
    height: var(--v-btn-height);
    padding: 0 4px 0 4px;
  }

  ::v-deep(.v-btn__prepend) {
    margin-inline: -4px 4px;
  }

  .file-btn.text-blue {
    padding-right: 40px;

    ::v-deep(.v-btn) {
      position: absolute;
      top: 0;
      right: 0;
    }
    ::v-deep(.v-btn .mdi-close) {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}

::v-deep(.model-btn) {
  max-width: 300px;
  width: auto;
  position: relative;
  display: flex;
  justify-content: start;
  overflow: hidden;
}

::v-deep(.autocomplete-model__list) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 15px;
  max-height: 300px;
  overflow: auto;
}

::v-deep(.autocomplete-model__item) {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;
}
</style>
