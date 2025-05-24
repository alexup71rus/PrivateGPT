<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import { useChatStore } from "@/stores/chat.ts";

const store = useChatStore();
const chatMessagesRef = ref<HTMLDivElement | null>(null);

const scrollDown = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTo({
      top: chatMessagesRef.value.scrollHeight,
      behavior: "auto",
    });
  }
}

watch(
  () => store.activeChat?.messages[store.activeChat?.messages.length - 1]?.content,
  async () => {
    await nextTick();
    scrollDown();
  },
  { deep: true }
);

onMounted(scrollDown)
</script>

<template>
  <div class="chat-page">
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="message in store.activeChat?.messages"
        :key="message.id"
        class="message-wrapper"
      >
        <MessageBubble :message="message" />
      </div>
    </div>

    <MessageBox class="message-box" />
  </div>
</template>

<style scoped lang="scss">
.chat-page {
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  padding: 16px;

  .chat-messages {
    margin-top: var(--header-height);
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
}
</style>
