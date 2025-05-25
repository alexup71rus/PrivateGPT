<script lang="ts" setup>
import {computed, nextTick, onMounted, ref} from "vue";
import {useChatStore} from "@/stores/chat.ts";
import {useAppSettings} from "@/composables/useAppSettings.ts";

const chat = useChatStore();
const { settings } = useAppSettings();
const textareaRef = ref<HTMLInputElement>();
const fileInputRef = ref<HTMLInputElement>();
const activeChat = computed(() => chat.activeChat);
const activeChatId = computed(() => chat.activeChatId);
const messageText = ref('');
const attachment = ref<File | null>(null);
const attachmentContent = ref<{ content: string, type: 'text' | 'image', meta: File } | null>(null);
const isSearch = ref(settings.isSearchAsDefault);
const canSend = computed(() => messageText.value.trim() && !chat.isSending);

function handleAttachClick() {
  fileInputRef.value?.click();
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  const isImage = /\.(png|jpe?g)$/i.test(file.name);
  const reader = new FileReader();

  reader.onload = () => {
    const result = reader.result as string;

    if (isImage) {
      const base64 = result.split(',')[1];
      attachmentContent.value = { content: base64, type: 'image', meta: file };
    } else {
      attachmentContent.value = { content: result, type: 'text', meta: file };
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

function removeAttachment() {
  attachment.value = null;
  attachmentContent.value = null;
}

function onFormSubmit(event: Event) {
  event.preventDefault();
  sendMessage();
}

async function sendMessage() {
  if (!canSend.value) return;

  chat.setIsSending(true);
  try {
    await chat.sendMessage(activeChatId.value, messageText.value, attachmentContent.value);
    messageText.value = '';
    attachment.value = null;
    attachmentContent.value = null;
    textareaRef.value?.focus();
  } finally {
    chat.setIsSending(false);
  }
}

function stopGeneration() {
  if (chat.abortController) {
    chat.abortController.abort();
    chat.setIsSending(false);

    const lastMessage = activeChat.value?.messages[activeChat.value.messages.length - 1];
    if (lastMessage?.isLoading) {
      chat.updateMessage(activeChatId.value, lastMessage.id, lastMessage.content, false);
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
      hidden
      type="file"
      @change="handleFilesSelected"
    />

    <div class="chat-input-container">
      <v-textarea
        ref="textareaRef"
        v-model="messageText"
        :disabled="chat.isSending"
        auto-grow
        class="chat-input"
        density="comfortable"
        hide-details
        placeholder="Введите сообщение..."
        rows="1"
        variant="solo-filled"
        @keydown.enter.exact.prevent.stop
        @keyup.enter.exact.prevent.stop="onFormSubmit"
      />
    </div>

    <div class="chat-input-actions">
      <v-btn
        :color="attachment ? 'blue' : 'white'"
        :disabled="chat.isSending"
        class="file-btn"
        variant="tonal"
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
        :color="isSearch ? 'blue' : 'white'"
        :disabled="chat.isSending"
        class="search-btn"
        prepend-icon="mdi-magnify"
        variant="tonal"
        @click="isSearch = !isSearch"
      >
        Поиск
      </v-btn>
      <v-spacer />
      <v-btn
        :color="chat.isSending ? 'error' : undefined"
        :disabled="!canSend"
        :icon="chat.isSending ? 'mdi-stop' : 'mdi-send'"
        class="send-btn"
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
