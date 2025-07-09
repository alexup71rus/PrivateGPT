<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useChatStore } from '@/stores/chat.ts';
import { useChatScroll } from '@/composables/useChatScroll.ts';
import { useAppStore } from '@/stores/app.ts';
import { throttle } from '@/utils/helpers.ts';

const app = useAppStore();
  const chat = useChatStore();
  const chatTitle = ref(chat.activeChat?.title ?? '');
  const messages = computed(() => chat.activeChat?.messages ?? []);
  const isLoading = computed(() =>
    Array.isArray(chat.activeChat?.messages) && chat.activeChat.messages[chat.activeChat.messages.length - 1]?.role === 'user' && chat.isSending
  );
  const { chatMessagesRef, chatGap, isShowScrollDown, scrollDown, updateActiveChatId } = useChatScroll(messages, chat.activeChatId);


  const renameChat = throttle(() => {
    chat.renameChat(chat.activeChatId, chatTitle.value);
  }, 500);

  watch(() => chat.activeChat?.id, (newId: string | undefined) => {
    if (newId) {
      updateActiveChatId(newId);
      chatTitle.value = chat.activeChat?.title ?? '';
    }
  });
</script>

<template>
  <div class="chat-page">
    <div :class="['chat-title', { 'chat-title--opened': app.isAsideOpen }]">
      <v-text-field
        v-model="chatTitle"
        :disabled="!chat.activeChat?.id || chat.isGeneratingTitle"
        hide-details="auto"
        label="Chat Title"
        variant="solo"
        @input="renameChat"
      />
      <v-tooltip text="Link to project GitHub">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="github-button"
            color="grey-darken-1"
            href="https://github.com/alexup71rus/plama"
            icon="mdi-github"
            target="_blank"
            variant="text"
          />
        </template>
      </v-tooltip>
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
          <h2>plama</h2>
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
    display: flex;
    justify-content: space-between;
    padding-bottom: 15px;
    width: 100%;
    margin-left: 50px;
    align-items: center;
    gap: 8px;
    transition: .4s ease-in-out;

    .v-input {
      opacity: .8;
      transition: ease-in-out 1s;
      transition-delay: .5s;

      ::v-deep(.v-field--variant-solo) {
        box-shadow: none;
        background-color: transparent;
        transition: ease-in-out .3s;
        transition-delay: .5s;
      }

      &:hover {
        opacity: 1;
        transition: ease-in-out .1s;
        transition-delay: 0s;

        ::v-deep(.v-field--variant-solo) {
          box-shadow: 0px 3px 1px -2px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, 0.2)), 0px 2px 2px 0px var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, 0.14)), 0px 1px 5px 0px var(--v-shadow-key-ambient-opacity, rgba(0, 0, 0, 0.12));
          background-color: rgb(var(--v-theme-surface));
          transition: ease-in-out .1s;
          transition-delay: 0s;
        }
      }
    }

    &--opened {
      margin-left: 0;
    }

    .github-button {
      flex-shrink: 0;
    }

    > .v-input {
      max-width: 400px;
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

  .message-wrapper::v-deep(.actions) {
    opacity: .15;
    transition: opacity ease-in-out .2s;
    transition-delay: .15s;
  }

  .message-wrapper:hover::v-deep(.actions) {
    opacity: 1;
    transition-delay: 0s;
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
    bottom: 130px;
    color: white;
  }
}
</style>
