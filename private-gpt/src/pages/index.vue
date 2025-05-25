<script lang="ts" setup>
import {computed, ref, watch} from "vue";
import {useChatStore} from "@/stores/chat.ts";
import {useChatScroll} from "@/composables/useChatScroll.ts";

const chat = useChatStore();
const chatTitle = ref(chat.activeChat?.title ?? '');
const messages = computed(() => chat.activeChat?.messages ?? []);
const { chatMessagesRef } = useChatScroll(messages);
const isLoading = computed(() => chat.activeChat?.messages[chat.activeChat.messages.length - 1]?.role === 'user' && chat.isSending);

watch(() => chatTitle.value || '', (newTitle: string) => {
  chat.renameChat(chat.activeChatId, newTitle);
});

watch(() => chat.activeChat?.title || '', (newTitle: string) => {
  chatTitle.value = newTitle;
});
</script>

<template>
  <div class="chat-page">
    <div class="chat-title">
      <v-text-field v-model="chatTitle" :disabled="!chat.activeChat?.id" label="Заголовок чата" variant="solo"></v-text-field>

    </div>

    <div ref="chatMessagesRef" class="chat-messages">
      <template v-if="chat.activeChat?.messages?.length">
        <div
          v-for="message in chat.activeChat?.messages"
          :key="message.id"
          class="message-wrapper"
        >
          <MessageBubble :message="message" />
        </div>

        <div v-if="isLoading" class="loader">
          <v-progress-circular
            color="primary"
            indeterminate
          ></v-progress-circular>
        </div>
      </template>
      <template v-else>
        <div class="chat-logo">
          <img alt="Chat logo" src="@/assets/logo.svg">
          <hr>
          <h2>PrivateGPT</h2>
        </div>
      </template>
    </div>

    <MessageBox class="message-box" />
  </div>
</template>

<style lang="scss" scoped>
.chat-page {
  --chat-title-max-width: 300px;
  --message-max-width: 800px;

  display: flex;
  flex-direction: column;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  padding: 7px 16px 16px;

  .chat-logo {
    filter: grayscale(1);
    opacity: .3;
    width: 100%;
    max-width: 200px;
    margin: auto auto;
    text-align: center;
    font-size: 18px;
  }

  .chat-title {
    margin-left: auto;
    width: 100%;
    max-width: var(--chat-title-max-width);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message-wrapper,
  .message-box {
    margin: 0 auto;
    width: 100%;
    max-width: var(--message-max-width);
  }

  .loader {
    display: flex;
    justify-content: center;
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    overflow: hidden;
  }
}
</style>
