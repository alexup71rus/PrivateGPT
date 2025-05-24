<script setup lang="ts">
import type { Message } from "@/types/chats.ts";
import { useChatStore } from "@/stores/chat.ts";
import { useAlert } from "@/plugins/alertPlugin.ts";
import { computed, onMounted, ref } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/default.css";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";

const props = defineProps<{
  message: Message;
}>();

const store = useChatStore();
const { showSnackbar } = useAlert();
const bubbleRef = ref();
const isEditDialogOpen = ref(false);
const editedContent = ref("");

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code, { language }).value;

      const lines = highlighted
        .split("\n")
        .map(
          (line, i) =>
            `<div class="code-line"><span class="line-number">${
              i + 1
            }</span><span class="line-content">${line}</span></div>`
        )
        .join("\n");

      return `
        <div class="code-block-wrapper">
          <button class="copy-button">Copy</button>
          <pre><code class="hljs language-${language}">${lines}</code></pre>
        </div>
      `;
    },
  })
);

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
  editedContent.value = props.message.content; // Инициализируем текст сообщения
  isEditDialogOpen.value = true; // Открываем модальное окно
};

const saveEditedMessage = () => {
  if (editedContent.value.trim()) {
    store.editMessage(store.activeChatId, props.message.id, editedContent.value);
    showSnackbar({ message: "Сообщение обновлено", type: "success" });
  } else {
    showSnackbar({ message: "Текст не может быть пустым", type: "warning" });
  }
  isEditDialogOpen.value = false; // Закрываем модальное окно
};

const closeEditDialog = () => {
  isEditDialogOpen.value = false; // Закрываем без сохранения
};

onMounted(() => {
  bubbleRef.value.addEventListener('click', async (ev) => {
    if (ev.target.classList.contains('copy-button')) {
      const block = ev.target.parentElement;
      const codeElement = block.querySelector('code');

      if (codeElement) {
        const code = codeElement.innerText.replace(/^\d+\s+/gm, '');
        await copyCodeBlock(code);
      }
    }
  })
});

const deleteMessage = () => {
  const chatId = store.activeChatId;
  if (chatId) store.deleteMessage(chatId, props.message.id);
};

const regenerateMessage = async () => {
  const chat = store.activeChat;
  if (!chat) return;
  const index = chat.messages.findIndex((m) => m.id === props.message.id);
  if (index <= 0) return;
  const prev = chat.messages[index - 1];
  if (prev.role !== 'user') return;

  store.setIsSending(true);
  await store.regenerateMessage(chat.id, props.message.id);
  store.setIsSending(false);
};

const saveSummary = async () => {
  const chatId = store.activeChatId;
  if (chatId) {
    try {
      const result = await store.saveSummary(chatId, props.message.id);

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
  <div ref="bubbleRef" class="message-bubble" :class="message.role">
    <div class="content" v-html="parsedContent" />
    <div v-if="false" class="attachments-scroll">
      <div class="attachment" />
    </div>
  </div>
  <div
    :class="['actions', 'actions--user', { disabled: message.isLoading }]"
    v-if="message.role === 'user'"
  >
    <v-btn size="small" variant="text" icon="mdi-content-copy" @click="copyMessage" />
    <v-btn size="small" variant="text" icon="mdi-pencil" @click="openEditDialog" />
    <v-btn
      size="small"
      variant="text"
      color="red"
      icon="mdi-delete"
      @click="deleteMessage"
    />
  </div>
  <div :class="['actions', { disabled: message.isLoading }]" v-else>
    <v-btn size="small" variant="text" icon="mdi-pencil" @click="openEditDialog" />
    <v-btn size="small" variant="text" icon="mdi-autorenew" @click="regenerateMessage" />
    <v-btn size="small" variant="text" icon="mdi-content-copy" @click="copyMessage" />
    <v-btn
      size="small"
      variant="text"
      icon="mdi-content-save"
      @click="saveSummary"
    />
  </div>

  <v-dialog v-model="isEditDialogOpen" max-width="800px">
    <v-card>
      <v-card-title>Редактировать сообщение</v-card-title>
      <v-card-text>
        <v-textarea
          v-model="editedContent"
          class="edit-textarea"
          label="Текст сообщения"
          variant="outlined"
          rows="5"
          auto-grow
          hide-details
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

.content ::v-deep {
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

.edit-textarea::v-deep(.v-field__field) {
  max-height: 300px;
  overflow: auto;
}
</style>
