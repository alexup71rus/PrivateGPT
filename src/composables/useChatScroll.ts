import {nextTick, onMounted, onUnmounted, type Ref, ref, watch} from 'vue';
import type {Chat} from "@/types/chats.ts";

export function useChatScroll(messages: Ref<Chat['messages'] | undefined>) {
  const chatMessagesRef = ref<HTMLDivElement | null>(null);
  const isShowScrollDown = ref(false);

  const scrollDown = async () => {
    await nextTick();
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTo({ top: chatMessagesRef.value.scrollHeight, behavior: 'auto' });
      isShowScrollDown.value = false;
    } else {
      console.warn('chatMessagesRef is null');
    }
  };

  const checkScrollPosition = () => {
    if (chatMessagesRef.value) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.value;
      isShowScrollDown.value = scrollTop + clientHeight < scrollHeight - 10;
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

  onMounted(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.addEventListener('scroll', checkScrollPosition);
    }
    if (messages.value?.length) {
      scrollDown();
    }
  });

  onUnmounted(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.removeEventListener('scroll', checkScrollPosition);
    }
  });

  return { chatMessagesRef, isShowScrollDown, scrollDown };
}
