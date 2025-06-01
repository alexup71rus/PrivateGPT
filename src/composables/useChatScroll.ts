import { nextTick, onMounted, onUnmounted, type Ref, ref, watch } from 'vue';
import type { Chat } from '@/types/chats.ts';
import { useSettingsStore } from '@/stores/settings.ts';

export function useChatScroll (messages: Ref<Chat['messages'] | undefined>, activeChatId: string) {
  const { settings, updateSettings } = useSettingsStore();
  const chatMessagesRef = ref<HTMLDivElement | null>(null);
  const isShowScrollDown = ref(false);
  const prevChatId = ref<string | null>(null);
  const chatId = ref(activeChatId);
  let chatGapDefault = 0;
  const oldMessagesLength = ref(0);
  const chatGap = ref(0);
  const oldScrollHeight = ref(chatMessagesRef.value?.scrollHeight);

  const scrollDown = async (isSmooth?: boolean) => {
    await nextTick();
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTo({
        top: chatMessagesRef.value.scrollHeight,
        behavior: isSmooth ? 'smooth' : 'instant',
      });
      isShowScrollDown.value = false;
    } else {
      console.warn('chatMessagesRef is null');
    }
  };

  const checkScrollPosition = () => {
    if (chatMessagesRef.value) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.value;
      isShowScrollDown.value = scrollTop + clientHeight < scrollHeight - 500;
    }
  };

  const updateActiveChatId = (newId: string) => {
    chatId.value = newId;
  };

  watch(
    () => [chatId.value, messages.value?.length, messages.value?.[messages.value.length - 1]?.content],
    async ([newChatId, newLength, newContent], [oldChatId, oldLength, oldContent]) => {
      if (newChatId !== oldChatId) {
        prevChatId.value = newChatId as string;
        oldMessagesLength.value = newLength as number;
        chatGap.value = 0;
        await scrollDown(false);
      } else if (oldMessagesLength.value !== newLength && settings.chatScrollMode === 'gap') {
        oldMessagesLength.value = newLength as number;
        oldScrollHeight.value = chatMessagesRef.value?.scrollHeight;
        chatGap.value = chatGapDefault;
        await scrollDown(true);
      } else {
        if (settings.chatScrollMode === 'gap') {
          const newGap = chatMessagesRef.value!.scrollHeight - oldScrollHeight.value!;

          if (newGap < 50) {
            chatGap.value = chatGap.value - newGap;
          }
        } else {
          await scrollDown(true);
        }
      }
    },
    { deep: true }
  );

  onMounted(async () => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.addEventListener('scroll', checkScrollPosition);
    }
    if (messages.value?.length) {
      await scrollDown();
    }

    if (settings.chatScrollMode === 'gap') {
      queueMicrotask(() => {
        chatGapDefault = window.innerHeight / 1.5 - 400;
      })
    }
  });

  onUnmounted(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.removeEventListener('scroll', checkScrollPosition);
    }
  });

  return { chatMessagesRef, chatGap, isShowScrollDown, scrollDown, updateActiveChatId };
}
