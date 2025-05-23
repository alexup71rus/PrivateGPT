<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useChatStore } from "@/stores/chat.ts";

const store = useChatStore();
const messageText = ref('');
const attachments = ref<File[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isSearch = ref(false);
const isSending = ref(false);

const attachmentPreviews = ref<{ file: File, url: string }[]>([]);

watch(
  attachments,
  (files) => {
    attachmentPreviews.value.forEach(p => URL.revokeObjectURL(p.url));
    attachmentPreviews.value = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  attachmentPreviews.value.forEach(p => URL.revokeObjectURL(p.url));
});

function handleAttachClick() {
  fileInputRef.value?.click();
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    attachments.value.push(...Array.from(input.files));
    input.value = '';
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1);
}

const isImage = (file: File) => file.type.startsWith('image/');

async function sendMessage(event: Event) {
  event.preventDefault();
  if (!messageText.value.trim() || !store.activeChatId || isSending.value) return;

  isSending.value = true;
  try {
    await store.sendMessage(store.activeChatId, messageText.value);
    messageText.value = '';
    attachments.value = [];
  } finally {
    isSending.value = false;
  }
}

function stopGeneration() {
  if (store.abortController) {
    store.abortController.abort();
  }
}
</script>

<template>
  <div class="chat-input-wrapper">
    <input
      ref="fileInputRef"
      type="file"
      multiple
      hidden
      @change="handleFilesSelected"
    />

    <div v-if="attachmentPreviews.length" class="attachments-scroll">
      <div
        v-for="(preview, index) in attachmentPreviews"
        :key="index"
        class="attachment"
      >
        <v-icon
          icon="mdi-close"
          class="remove-icon"
          size="x-small"
          @click="removeAttachment(index)"
        />
        <img
          v-if="isImage(preview.file)"
          :src="preview.url"
          class="attachment-image"
        />
        <div v-else class="attachment-file">
          {{ preview.file.name }}
        </div>
      </div>
    </div>

    <v-textarea
      v-model="messageText"
      class="chat-input"
      placeholder="Введите сообщение..."
      auto-grow
      rows="1"
      hide-details
      variant="solo-filled"
      density="comfortable"
      :disabled="isSending"
      @keydown.enter.exact.prevent.stop
      @keyup.enter.exact.prevent.stop="sendMessage"
    />

    <div class="chat-input-actions">
      <v-tooltip location="top">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-magnify"
            size="small"
            variant="text"
            class="icon-btn"
            :disabled="isSending"
            :color="isSearch ? 'blue' : ''"
            @click="isSearch = !isSearch"
          />
        </template>
        <span>{{ isSearch ? 'Выключить' : 'Включить' }} поиск</span>
      </v-tooltip>

      <v-tooltip location="top">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-paperclip"
            size="small"
            variant="text"
            class="icon-btn"
            @click="handleAttachClick"
            :disabled="isSending"
          />
        </template>
        <span>Прикрепить файл</span>
      </v-tooltip>

      <v-tooltip location="top">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            :icon="isSending ? 'mdi-stop' : 'mdi-send'"
            size="small"
            variant="text"
            class="icon-btn"
            :disabled="!messageText.trim()"
            :color="isSending ? 'error' : undefined"
            @click="isSending ? stopGeneration() : sendMessage($event)"
          />
        </template>
        <span>{{ isSending ? 'Остановить генерацию' : 'Отправить' }}</span>
      </v-tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-input-wrapper {
  padding: var(--padding-body);
  background-color: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 10px;
}

.attachments-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  .attachment {
    position: relative;
    flex: 0 0 auto;
    width: 100px;
    height: 100px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    padding: 4px;
    text-align: center;
    overflow: hidden;
  }

  .remove-icon {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    background: rgb(var(--v-theme-surface));
    object-fit: contain;
    border-radius: 50%;
    cursor: pointer;
    z-index: 2;
  }

  .attachment-image {
    width: 130px;
    height: 130px;
    object-fit: cover;
  }

  .attachment-file {
    display: flex;
    align-items: center;
    padding: 8px;
    word-break: break-word;
    text-align: center;
    height: 100px;
    overflow: auto;
  }
}

.chat-input {
  max-height: 200px;
  overflow: auto;
}

.chat-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.icon-btn {
  padding: 0;
  min-width: 36px;
}
</style>
