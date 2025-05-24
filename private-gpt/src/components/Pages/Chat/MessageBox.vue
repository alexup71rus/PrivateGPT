<script setup lang="ts">
import {ref, computed, watch, onBeforeUnmount, onMounted, nextTick} from "vue";
import { useChatStore } from "@/stores/chat.ts";

const store = useChatStore();
const textareaRef = ref();
const messageText = ref('');
const attachment = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isSearch = ref(false);

onBeforeUnmount(() => {
  if (attachment.value) {
    URL.revokeObjectURL(URL.createObjectURL(attachment.value));
  }
});

function handleAttachClick() {
  fileInputRef.value?.click();
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    attachment.value = input.files[0];
    input.value = '';
  }
}

function removeAttachment() {
  attachment.value = null;
}

async function sendMessage(event: Event) {
  event.preventDefault();
  if (!messageText.value.trim() || !store.activeChatId || store.isSending) return;

  store.setIsSending(true);

  try {
    await store.sendMessage(store.activeChatId, messageText.value);
    messageText.value = '';
    attachment.value = null;

    setTimeout(() => {
      textareaRef.value?.focus();
    }, 0);
  } finally {
    store.setIsSending(false);
  }
}

function stopGeneration() {
  if (store.abortController) {
    store.abortController.abort();
    store.setIsSending(false);

    const lastMessage = store.activeChat?.messages[store.activeChat.messages.length - 1];
    if (lastMessage?.isLoading) {
      store.updateMessage(store.activeChatId, lastMessage.id, lastMessage.content, false);
    }
  }
}

onMounted(() => {
  nextTick(() => textareaRef.value?.focus());
});
</script>

<template>
  <div class="chat-input-wrapper">
    <input
      ref="fileInputRef"
      type="file"
      hidden
      @change="handleFilesSelected"
    />

    <div class="chat-input-container">
      <v-textarea
        ref="textareaRef"
        v-model="messageText"
        class="chat-input"
        placeholder="Введите сообщение..."
        auto-grow
        rows="1"
        hide-details
        variant="solo-filled"
        density="comfortable"
        :disabled="store.isSending"
        @keydown.enter.exact.prevent.stop
        @keyup.enter.exact.prevent.stop="sendMessage"
      />
    </div>

    <div class="chat-input-actions">
      <v-btn
        variant="tonal"
        class="file-btn"
        :disabled="store.isSending"
        :color="attachment ? 'blue' : 'white'"
        @click="handleAttachClick"
      >
        <template #prepend>
          <v-icon>mdi-paperclip</v-icon>
        </template>
        <span v-if="attachment" v-tooltip:top="attachment.name">{{ attachment.name }}</span>
        <span v-else>Прикрепить</span>
        <v-btn
          v-if="attachment"
          icon="mdi-close"
          size="small"
          variant="text"
          @click.stop="removeAttachment"
        />
      </v-btn>

      <v-btn
        prepend-icon="mdi-magnify"
        variant="tonal"
        class="search-btn"
        :disabled="store.isSending"
        :color="isSearch ? 'blue' : 'white'"
        @click="isSearch = !isSearch"
      >
        Поиск
      </v-btn>
      <v-spacer />
      <v-btn
        :icon="store.isSending ? 'mdi-stop' : 'mdi-send'"
        size="small"
        variant="text"
        class="send-btn"
        :disabled="!messageText.trim() && !store.isSending"
        :color="store.isSending ? 'error' : undefined"
        @click="store.isSending ? stopGeneration() : sendMessage($event)"
      />
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
  border-radius: 30px;
}

.chat-input-container {
  ::v-deep(.v-field) {
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
</style>
