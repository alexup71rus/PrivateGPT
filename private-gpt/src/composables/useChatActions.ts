import {useChatStore} from '@/stores/chat';
import type {Chat} from "@/types/chats.ts";
import {useAppSettings} from "@/composables/useAppSettings.ts";
import {useAppRouting} from "@/composables/useAppRouting.ts";

export function useChatActions() {
  const chat = useChatStore();
  const { settings } = useAppSettings();
  const { currentChatId, navigateWithHash } = useAppRouting();

  const onNewChat = async () => {
    try {
      const activeChat = chat.activeChat;
      let _chat: Chat;

      if (activeChat && activeChat.messages.length === 0) {
        _chat = activeChat;
      } else {
        _chat = await chat.createChat();
      }

      await navigateWithHash(_chat.id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const selectChat = async (chatId: string) => {
    try {
      if (chat.chats?.some(c => c.id === chatId)) {
        chat.activeChatId = chatId;
        await navigateWithHash(chatId);
      }
    } catch (error) {
      console.error('Error selecting chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      if (chat.chats.length === 1) {
        const _chat = chat.chats[0];
        await chat.renameChat(_chat.id, settings.defaultChatTitle);
        _chat.messages = [];
        await chat.persistChat(_chat.id);
        await selectChat(_chat.id);
      } else {
        await chat.deleteChat(chatId);
        if (chat.chats.length > 0) {
          await selectChat(chat.chats[0].id);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const initFromHash = async () => {
    if (currentChatId.value) {
      await selectChat(currentChatId.value);
    } else if (chat.chats.length > 0) {
      await selectChat(chat.chats[0].id);
    } else {
      await onNewChat();
    }
  };

  return {
    onNewChat,
    selectChat,
    deleteChat,
    initFromHash
  };
}
