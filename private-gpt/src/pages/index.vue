<script setup lang="ts">
import { ref } from "vue";
import { useChatStore } from "@/stores/chat.ts";

const store = useChatStore();
const messageText = ref('');
</script>

<template>
  <div class="chat-page">
    <div class="chat-messages">
      <div v-for="message in store.activeChat?.messages" :key="message.id" class="message">
        <div :class="message.role === 'user' ? 'user-message' : 'assistant-message'">
          {{ message.content }}
        </div>
      </div>
    </div>

    <MessageBox />
  </div>
</template>

<style scoped lang="scss">
.chat-page {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  width: 100%;
  max-width: 800px;
  height: 100%;
  padding: 16px;

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 16px;
  }

  .chat-input-box {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    padding-top: 8px;
  }

  textarea {
    max-height: 300px;
  }
}
</style>
