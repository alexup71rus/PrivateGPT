<script lang="ts" setup>
import type {Message} from "@/types/chats.ts";
import {useChatStore} from "@/stores/chat.ts";
import {useAlert} from "@/plugins/alertPlugin.ts";
import {computed, onMounted, ref} from "vue";
import "highlight.js/styles/default.css";
import {marked} from "@/utils/markdown.ts";
import {useCopyCode} from "@/composables/useCopyCode.ts";

const props = defineProps<{
  message: Message;
}>();

const chat = useChatStore();
const { showSnackbar } = useAlert();
const bubbleRef = ref();
const isEditDialogOpen = ref(false);
const editedContent = ref("");

useCopyCode(bubbleRef, showSnackbar);

const parsedContent = computed(() => {
  return marked.parse(props.message.content);
});

const copyMessage = async () => {
  await navigator.clipboard.writeText(props.message.content);
  showSnackbar({
    message: 'Скопировано!',
    type: 'success',
  });
};

const copyCodeBlock = async (code: string) => {
  await navigator.clipboard.writeText(code);
  showSnackbar({
    message: 'Код скопирован!',
    type: 'success',
  });
};

const openEditDialog = () => {
  editedContent.value = props.message.content;
  isEditDialogOpen.value = true;
};

const saveEditedMessage = () => {
  if (editedContent.value.trim()) {
    chat.editMessage(chat.activeChatId, props.message.id, editedContent.value);
    showSnackbar({ message: "Сообщение обновлено", type: "success" });
  } else {
    showSnackbar({ message: "Текст не может быть пустым", type: "warning" });
  }
  isEditDialogOpen.value = false;
};

const closeEditDialog = () => {
  isEditDialogOpen.value = false;
};

onMounted(() => {
  bubbleRef.value.addEventListener('click', async (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;

    if (target.classList.contains('copy-button')) {
      const block = target.parentElement;

      if (block) {
        const codeElement = block.querySelector('code');

        if (codeElement) {
          const code = codeElement.innerText.replace(/^\d+\s+/gm, '');
          await copyCodeBlock(code);
        }
      }
    }
  });
});

const deleteMessage = () => {
  const chatId = chat.activeChatId;
  if (chatId) chat.deleteMessage(chatId, props.message.id);
};

const regenerateMessage = async () => {
  const _chat = chat.activeChat;
  if (!_chat) return;
  const index = _chat.messages.findIndex((m) => m.id === props.message.id);
  if (index <= 0) return;
  const prev = _chat.messages[index - 1];
  if (prev.role !== 'user') return;

  chat.setIsSending(true);
  await chat.regenerateMessage(_chat.id, props.message.id);
  chat.setIsSending(false);
};

const saveSummary = async () => {
  const chatId = chat.activeChatId;
  if (chatId) {
    try {
      const result = await chat.saveSummary(chatId, props.message.id);

      if (result) {
        showSnackbar({ message: 'Память обновлена: ' + result, type: 'success' });
      } else {
        showSnackbar({ message: 'Нечего сохранять', type: 'warning' });
      }
    } catch (error) {
      showSnackbar({ message: 'Ошибка при сохранении саммари', type: 'error' });
    }
  }
};
</script>

<template>
  <div ref="bubbleRef" :class="message.role" class="message-bubble">
    <div class="content" v-html="parsedContent" />
    <div v-if="false" class="attachments-scroll">
      <div class="attachment" />
    </div>
  </div>
  <div
    v-if="message.role === 'user'"
    :class="['actions', 'actions--user', { disabled: message.isLoading }]"
  >
    <v-btn icon="mdi-content-copy" size="small" variant="text" @click="copyMessage" />
    <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditDialog" />
    <v-btn
      color="red"
      icon="mdi-delete"
      size="small"
      variant="text"
      @click="deleteMessage"
    />
  </div>
  <div v-else :class="['actions', { disabled: message.isLoading }]">
    <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditDialog" />
    <v-btn icon="mdi-autorenew" size="small" variant="text" @click="regenerateMessage" />
    <v-btn icon="mdi-content-copy" size="small" variant="text" @click="copyMessage" />
    <v-btn
      icon="mdi-content-save"
      size="small"
      variant="text"
      @click="saveSummary"
    />
  </div>

  <v-dialog v-model="isEditDialogOpen" max-width="800px">
    <v-card>
      <v-card-title>Редактировать сообщение</v-card-title>
      <v-card-text>
        <v-textarea
          v-model="editedContent"
          auto-grow
          class="edit-textarea"
          hide-details
          label="Текст сообщения"
          rows="5"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text @click="saveEditedMessage">Сохранить</v-btn>
        <v-btn text @click="closeEditDialog">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss" scoped>
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

:deep(.content) {
  display: flex;
  flex-direction: column;
  gap: 4px;

  ol,
  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 20px;
    margin: 4px 0 6px;
  }

  > pre:not(:last-child) {
    margin-bottom: 10px;
  }

  .hljs {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 5px;
    background: #1a1b20;
    color: #ffffff;
    border-radius: 10px;

    &:not(:last-child) {
      margin-bottom: 10px;
    }
  }

  .code-block-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    font-size: 12px;

    .copy-button {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      z-index: 1;
    }

    .code-line {
      display: flex;
    }

    .line-number {
      width: 2em;
      text-align: right;
      padding-right: 1em;
      user-select: none;
      opacity: 0.5;
    }

    .line-content {
      flex: 1;
    }
  }
}

:deep(.edit-textarea .v-field__field) {
  max-height: 300px;
  overflow: auto;
}
</style>
