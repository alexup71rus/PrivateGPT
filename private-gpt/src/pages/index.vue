<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import { useChatStore } from "@/stores/chat.ts";

const store = useChatStore();
const chatMessagesRef = ref<HTMLDivElement | null>(null);
const chatTitle = ref(store.activeChat?.title ?? '');

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

watch(() => chatTitle.value || '', (newTitle: string) => {
  store.renameChat(store.activeChatId, newTitle);
})
watch(() => store.activeChat?.title || '', (newTitle: string) => {
  chatTitle.value = newTitle;
})

onMounted(scrollDown)
</script>

<template>
  <div class="chat-page">
    <div class="chat-title">
      <v-text-field v-model="chatTitle" label="Заголовок чата" variant="solo"></v-text-field>

    </div>

    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="message in store.activeChat?.messages"
        :key="message.id"
        class="message-wrapper"
      >
        <MessageBubble :message="message" />
      </div>

      <div v-if="store.activeChat?.messages[store.activeChat?.messages.length-1]?.role === 'user'" class="loader">
        <v-progress-circular
          color="primary"
          indeterminate
        ></v-progress-circular>
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
  padding: 7px 16px 16px;

  .chat-title {
    margin-left: auto;
    width: 100%;
    max-width: 300px;
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
}
</style>
