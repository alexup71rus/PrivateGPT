<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useChatStore } from '@/stores/chat.ts';
  import { useChatScroll } from '@/composables/useChatScroll.ts';
  import { useAppStore } from '@/stores/app.ts';
  import { useSettingsStore } from '@/stores/settings.ts';

  const app = useAppStore();
  const chat = useChatStore();
  const settings = useSettingsStore();
  const chatTitle = ref(chat.activeChat?.title ?? '');
  const messages = computed(() => chat.activeChat?.messages ?? []);
  const isLoading = computed(() =>
    chat.activeChat?.messages[chat.activeChat.messages.length - 1]?.role === 'user' && chat.isSending
  );
  const { chatMessagesRef, chatGap, isShowScrollDown, scrollDown, updateActiveChatId } = useChatScroll(messages, chat.activeChatId);

  watch(() => chatTitle.value || '', (newTitle: string) => {
    chat.renameChat(chat.activeChatId, newTitle);
  });

  watch(() => chat.activeChat?.title || '', (newTitle: string) => {
    chatTitle.value = newTitle;
  });

  watch(() => chat.activeChatId, (newId: string) => {
    updateActiveChatId(newId);
  });
</script>

<template>
  <div class="chat-page">
    <div :class="['chat-title', { 'chat-title--opened': app.isAsideOpen }]">
      <v-text-field
        v-model="chatTitle"
        :disabled="!chat.activeChat?.id || chat.isGeneratingTitle"
        hide-details="auto"
        label="Заголовок чата"
        variant="solo"
      />
    </div>

    <div ref="chatMessagesRef" class="chat-messages" :style="{ paddingBottom: `${chatGap}px` }">
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
          />
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

    <v-fade-transition>
      <v-btn
        v-show="isShowScrollDown"
        class="chat-scroll-down"
        color="blue"
        icon="mdi-arrow-collapse-down"
        variant="elevated"
        @click="scrollDown(true)"
      />
    </v-fade-transition>

    <MessageBox class="message-box" />
  </div>
</template>

<style lang="scss" scoped>
::v-global(.electron .chat-page) {
  height: calc(100vh - 48px) !important;
}

.chat-page {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  padding: 7px 16px 16px;

  .chat-title {
    padding-bottom: 15px;
    width: 100%;
    max-width: 400px;
    margin-left: 50px;
    transition: .4s ease-in-out;

    &--opened {
      margin-left: 0;
    }
  }

  .chat-logo {
    filter: grayscale(1);
    opacity: .3;
    width: 100%;
    max-width: 200px;
    margin: auto auto;
    text-align: center;
    font-size: 18px;
    animation: fadeIn 0.3s ease-in-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: .3;
    }
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
    max-width: 800px;
  }

  .loader {
    display: flex;
    justify-content: center;
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    overflow: hidden;
  }

  .chat-scroll-down {
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    bottom: 120px;
    color: white;
  }
}
</style>
