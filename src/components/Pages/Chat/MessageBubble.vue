<script lang="ts" setup>
import type {Attachment, Message} from "@/types/chats.ts";
import {useChatStore} from "@/stores/chat.ts";
import {useAlert} from "@/plugins/alertPlugin.ts";
import {computed, nextTick, onMounted, ref, watch} from "vue";
import "highlight.js/styles/default.css";
import {parseMarkdown} from "@/utils/markdown.ts";
import {useCopyCode} from "@/composables/useCopyCode.ts";

const props = defineProps<{
  message: Message;
}>();

const chat = useChatStore();
const { showSnackbar } = useAlert();
const bubbleRef = ref();
const isEditDialogOpen = ref(false);
const editedContent = ref("");
const expandedPanel = ref<number[] | number | null>(null);
const thinkPreviewRef = ref<HTMLElement>();

const formatFileSize = computed(() => (size: number | undefined) => {
  if (!size) return '';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(2)} МБ`;
});

useCopyCode(bubbleRef, showSnackbar);

const parsedThinkContent = computed(() => {
  return parseMarkdown(props.message.content, true);
});
const parsedContent = computed(() => {
  return parseMarkdown(props.message.content);
});
const formatThinkTime = (milliseconds: number) => {
  if (milliseconds < 1000) return `${milliseconds} мс`;
  return `${(milliseconds / 1000).toFixed(1)} сек`;
};

const copyMessage = async () => {
  console.log(props.message)
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

const saveEditedMessage = async (makeResend = false) => {
  if (!editedContent.value.trim()) {
    showSnackbar({ message: "Текст не может быть пустым", type: "warning" });
    return;
  }

  await chat.editMessage(chat.activeChatId, props.message.id, editedContent.value);
  showSnackbar({ message: "Сообщение обновлено", type: "success" });

  if (!makeResend) {
    isEditDialogOpen.value = false;
    return;
  }

  const _chat = chat.activeChat;
  if (!_chat) return;

  const index = _chat.messages.findIndex((m) => m.id === props.message.id);
  if (index < 0) return;

  _chat.messages = _chat.messages.slice(0, index);
  await chat.persistChat(_chat.id);

  chat.setIsSending(true);

  if (props.message.role === 'user') {
    await chat.sendMessage(
      chat.activeChatId,
      editedContent.value,
      props.message.attachmentContent ? {
        content: props.message.attachmentContent,
        type: props.message.attachmentMeta?.type || 'text',
        meta: props.message.attachmentMeta
      } as Attachment : null
    );
  } else {
    if (index === 0) return;

    const prevMessage = _chat.messages[index - 1];
    if (prevMessage.role !== 'user') return;

    await chat.sendMessage(
      chat.activeChatId,
      prevMessage.content,
      prevMessage.attachmentContent ? {
        content: prevMessage.attachmentContent,
        type: prevMessage.attachmentMeta?.type || 'text',
        meta: prevMessage.attachmentMeta
      } as Attachment : null
    );
  }

  chat.setIsSending(false);
  isEditDialogOpen.value = false;
};

const closeEditDialog = () => {
  isEditDialogOpen.value = false;
};

onMounted(async () => {
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

watch(() => props.message.content, async () => {
  await nextTick();
  thinkPreviewRef.value?.scrollTo({
    top: thinkPreviewRef.value.scrollHeight - 55,
    behavior: 'smooth'
  });
});
</script>

<template>
  <div ref="bubbleRef" :class="message.role" class="message-bubble">
    <v-chip
      v-if="message.attachmentMeta"
      :prepend-icon="message.attachmentMeta?.type === 'text' ? 'mdi-file-document' : 'mdi-file-image'"
    >
      {{ message.attachmentMeta.name }} [{{ formatFileSize(message.attachmentMeta.size) }}]
    </v-chip>
    <div v-if="message.thinkTime !== undefined" class="think-preview">
      <v-expansion-panels v-model="expandedPanel">
        <v-expansion-panel
          :title="message.isThinking ? `Размышляю... (${formatThinkTime(message.thinkTime ?? 0)})` : `Размышлял в течение: ${formatThinkTime(message.thinkTime ?? 0)}`"
        >
          <v-expansion-panel-text>
            <v-card variant="tonal" v-html="parsedThinkContent" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-expand-transition>
        <v-card
          v-if="message.isThinking && (expandedPanel === null || expandedPanel === undefined)"
          class="preview"
          variant="elevated"
        >
          <template v-slot:text>
            <div class="preview__content" ref="thinkPreviewRef" v-html="parsedThinkContent"></div>
          </template>
        </v-card>
      </v-expand-transition>
    </div>
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
        <v-btn v-if="message.role === 'user'" color="primary" text @click="saveEditedMessage(true)">Сохранить и отправить</v-btn>
        <v-btn color="primary" text @click="saveEditedMessage()">Сохранить</v-btn>
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

  ::v-deep(hidden) {
    display: none;
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

.think {
  margin-bottom: 10px;
}

.think-preview > .v-card {
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3rem;
    pointer-events: none;
    z-index: 1;
  }

  &::before {
    top: 5px;
    background: linear-gradient(to bottom, rgb(var(--v-theme-surface)), transparent);
  }

  &::after {
    bottom: 0;
    background: linear-gradient(to top, rgb(var(--v-theme-surface)), transparent);
  }
}

.think-preview .preview {
  transform: translateY(-5px);
  position: relative;
  color: rgb(var(--v-theme-on-background));
  transition: 0.2s;

  &__content {
    height: 3rem;
    overflow: hidden;
    position: relative;
  }
}

.think-preview + .content {
  margin-top: 10px;
}

</style>
