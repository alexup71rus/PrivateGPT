import {nextTick, onMounted, type Ref, ref, watch} from 'vue';
import type {Chat} from "@/types/chats.ts";

export function useChatScroll(messages: Ref<Chat['messages'] | undefined>) {
  const chatMessagesRef = ref<HTMLDivElement | null>(null);

  const scrollDown = async () => {
    await nextTick();
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTo({ top: chatMessagesRef.value.scrollHeight, behavior: 'auto' });
    } else {
      console.warn('chatMessagesRef is null');
    }
  };

  watch(
    () => [messages.value?.length, messages.value?.[messages.value.length - 1]?.content],
    async ([newLength, newContent]) => {
      if (newLength) {
        await scrollDown();
      }
    },
    { deep: true }
  );

  onMounted(async () => {
    if (messages.value?.length) {
      await scrollDown();
    }
  });

  return { chatMessagesRef };
}
