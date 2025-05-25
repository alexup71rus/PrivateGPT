import {useChatStore} from '@/stores/chat';
import {useRouter} from 'vue-router';
import type {Chat} from "@/types/chats.ts";
import {useAppSettings} from "@/composables/useAppSettings.ts";

export function useChatActions() {
  const router = useRouter();
  const chat = useChatStore();
  const { settings } = useAppSettings();

  const onNewChat = () => {
    const activeChat = chat.activeChat;
    let _chat: Chat;

    if (activeChat && activeChat.messages.length === 0) {
      _chat = activeChat;
    } else {
      _chat = chat.createChat();
    }

    router.push(`/#${_chat.id}`);
  };

  const selectChat = (chatId: string) => {
    chat.activeChatId = chatId;
    router.push(`/#${chatId}`);
  };

  const deleteChat = (chatId: string) => {
    if (chat.chats.length === 1) {
      const _chat = chat.chats[0];
      _chat.messages = [];
      _chat.title = settings.defaultChatTitle;
      selectChat(_chat.id);
    } else {
      chat.deleteChat(chatId);
      if (chat.chats.length > 0) {
        selectChat(chat.chats[0].id);
      }
    }
  };

  return { onNewChat, selectChat, deleteChat };
}
