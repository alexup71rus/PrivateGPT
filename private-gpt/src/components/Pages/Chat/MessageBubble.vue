<script setup lang="ts">
import type { Message } from "@/types/chats.ts";
import { useChatStore } from "@/stores/chat.ts";
import { useAlert } from "@/plugins/alertPlugin.ts";

const props = defineProps<{
  message: Message;
}>();

const store = useChatStore();
const { showSnackbar } = useAlert();

const copyMessage = async () => {
  await navigator.clipboard.writeText(props.message.content);
  showSnackbar({
    message: 'Скопировано!',
    type: 'success',
  });
};

const deleteMessage = () => {
  const chatId = store.activeChatId;
  if (chatId) store.deleteMessage(chatId, props.message.id);
};

const regenerateMessage = () => {
  const chat = store.activeChat;
  if (!chat) return;
  const index = chat.messages.findIndex(m => m.id === props.message.id);
  if (index <= 0) return;
  const prev = chat.messages[index - 1];
  if (prev.role !== 'user') return;
  store.regenerateMessage(chat.id, props.message.id);
};

const saveSummary = async () => {
  const chatId = store.activeChatId;
  if (chatId) {
    try {
      await store.saveSummary(chatId, props.message.id);
      showSnackbar({ message: 'Память обновлена', type: 'success' });
    } catch (error) {
      showSnackbar({ message: 'Ошибка при сохранении саммари', type: 'error' });
    }
  }
};
</script>

<template>
  <div class="message-bubble" :class="message.role">
    <div class="content">
      {{ message.content }}
    </div>
    <div v-if="false" class="attachments-scroll">
      <div class="attachment" />
    </div>
  </div>
  <div :class="['actions', 'actions--user', { 'disabled': message.isLoading }]" v-if="message.role === 'user'">
    <v-btn size="small" variant="text" icon="mdi-content-copy" @click="copyMessage" />
    <v-btn size="small" variant="text" icon="mdi-pencil" />
    <v-btn size="small" variant="text" color="red" icon="mdi-delete" @click="deleteMessage" />
  </div>
  <div :class="['actions', { 'disabled': message.isLoading }]" v-else>
    <v-btn size="small" variant="text" icon="mdi-pencil" />
    <v-btn size="small" variant="text" icon="mdi-autorenew" @click="regenerateMessage" />
    <v-btn size="small" variant="text" icon="mdi-content-copy" @click="copyMessage" />
    <v-btn
      size="small"
      variant="text"
      icon="mdi-content-save"
      @click="saveSummary"
    />
  </div>
</template>

<style scoped lang="scss">
.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  margin-bottom: 8px;
  position: relative;
  word-wrap: break-word;

  &.user {
    margin-left: auto;
    background-color: var(--user-message-bg, #007AFF);
    color: var(--user-message-text, white);
    border-bottom-right-radius: 4px;
  }

  &.assistant {
    align-self: flex-start;
    background-color: var(--assistant-message-bg, #F2F2F7);
    color: var(--assistant-message-text, black);
    border-bottom-left-radius: 4px;
  }

  .content {
    white-space: pre-wrap;
  }

  .attachments-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin-top: 8px;
    padding-bottom: 4px;

    .attachment {
      flex: 0 0 auto;
      width: 100px;
      height: 100px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.05);
    }
  }
}

.actions {
  &--user {
    text-align: right;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
</style>
