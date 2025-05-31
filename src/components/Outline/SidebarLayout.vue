<script lang="ts" setup>
  import { useChatStore } from '@/stores/chat.ts';
  import { computed, onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useChatActions } from '@/composables/useChatActions.ts';
  import { useAppStore } from '@/stores/app.ts';
  import { useAlert } from '@/plugins/alertPlugin.ts';
  import { useDeleteButton } from '@/composables/useDeleteButton.ts';
  import type { Chat } from '@/types/chats.ts';
  import { formatDate } from '../../utils/chatUtils.ts';

  const props = defineProps<{
    isChatPage: boolean;
  }>();

  const router = useRouter();
  const app = useAppStore();
  const chat = useChatStore();
  const { showSnackbar, showConfirm } = useAlert();
  const { onNewChat, selectChat, deleteChat } = useChatActions();
  const { handleFirstClick, handleSecondClick, resetDeletePending, isPending } = useDeleteButton(deleteChat);

  const searchQuery = ref<string>('');

  const groupedChats = computed(() => {
    const groups: { [key: string]: Chat[] } = {};
    const sortedChats = [...chat.chats]
      .filter(chat => chat.title.toLowerCase().includes(searchQuery.value?.toLowerCase() || ''))
      .sort((a, b) => b.timestamp - a.timestamp);

    sortedChats.forEach(chat => {
      const date = new Date(chat.timestamp);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(chat);
    });

    return Object.entries(groups).map(([dateKey, chats]) => ({
      date: new Date(dateKey),
      chats,
    }));
  });

  const handleChatClick = (id: string) => {
    selectChat(id);
  };

  const toggleSettings = async () => {
    if (props.isChatPage) {
      router.push(`/settings`);
    } else {
      const activeChat = chat.activeChat;

      if (activeChat) {
        router.push(`/#${activeChat.id}`);
      } else {
        onNewChat();
      }
    }
  };

  const initializeChat = () => {
    const hash = window.location.hash.slice(1);
    if (hash && chat.chats.some(chat => chat.id === hash)) {
      selectChat(hash);
      return;
    }

    if (chat.chats.length > 0) {
      selectChat(chat.chats[0].id);
    }
  };

  const removeAllChats = async () => {
    showConfirm({
      title: 'Предупреждение',
      message: 'Вы действительно хотите удалить все чаты?',
      buttons: [
        { text: 'Да', color: 'warning', value: true },
        { text: 'Отмена', color: 'white', value: false },
      ],
      resolve: () => {
        chat.clearChats();
        showSnackbar({ message: 'Все чаты успешно удалены', type: 'success' });
      },
    });
  };

  onMounted(initializeChat);
</script>

<template>
  <div :class="['sidebar', { 'sidebar--opened': app.isAsideOpen, 'sidebar-chat': isChatPage }]">
    <div class="sidebar__collapsed-item">
      <v-btn
        class="sidebar__burger"
        :icon="app.isAsideOpen ? 'mdi-backburger' : 'mdi-menu'"
        @click="app.setAside(!app.isAsideOpen)"
      />
      <img
        alt="Chat logo"
        class="sidebar__logo"
        :class="{ 'fade-in': app.isAsideOpen, 'fade-out': !app.isAsideOpen }"
        src="@/assets/logo.svg"
      >
      <v-btn class="new-chat-btn" icon="mdi-autorenew" @click="onNewChat" />
    </div>

    <transition name="fade">
      <div v-if="app.isAsideOpen && isChatPage" class="chats-container">
        <v-text-field
          v-model="searchQuery"
          class="chats-search-input"
          clearable
          hide-details="auto"
          label="Поиск"
          variant="solo-inverted"
        >
          <template #append-inner>
            <v-btn
              v-tooltip="'Удалить все чаты'"
              color="red"
              icon="mdi-trash-can"
              variant="plain"
              @click="removeAllChats"
            />
          </template>
        </v-text-field>

        <div class="chat-list">
          <template v-if="chat.chats?.length > 0">
            <div v-for="group in groupedChats" :key="group.date.toString()" class="chat-group">
              <div class="date-divider">{{ formatDate(group.date.getTime()) }}</div>
              <div
                v-for="_chat in group.chats"
                :key="_chat.id"
                :class="['chat-item', { 'chat-item--selected': chat.activeChatId === _chat.id }]"
                @click="handleChatClick(_chat.id)"
              >
                <span>{{ _chat.title }}</span>
                <v-btn
                  class="delete-btn"
                  :color="isPending(_chat.id) ? 'red' : ''"
                  icon="mdi-delete"
                  size="small"
                  @click.stop="isPending(_chat.id) ? handleSecondClick(_chat.id) : handleFirstClick(_chat.id)"
                  @mouseleave="resetDeletePending"
                />
              </div>
            </div>
          </template>
          <v-skeleton-loader v-else :elevation="3" type="paragraph@3" />
        </div>
      </div>
    </transition>

    <v-btn
      class="settings-btn"
      :color="!isChatPage ? 'blue' : ''"
      icon="mdi-wrench"
      @click="toggleSettings"
    />
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  top: 0;
  left: 0;
  width: var(--aside-width--collapsed);
  height: 100%;
  padding: var(--padding-body);
  background-color: rgba(var(--v-theme-surface));
  transition: .3s;

  &--opened {
    width: var(--aside-width--showed);
  }

  &__burger {
    z-index: 1;
  }

  &__logo {
    position: absolute;
    left: 50%;
    top: var(--padding-body);
    height: 50px;
    transform: translateX(-50%);
    transition: .8s;
    pointer-events: none;
    animation: fadeInOut 0.3s ease-in-out forwards;
  }

  &__logo.fade-in {
    animation: fadeIn 0.3s ease-in-out forwards;
  }

  &__logo.fade-out {
    animation: fadeOut 0.15s ease-in-out forwards;
  }

  &__collapsed-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.new-chat-btn {
  position: absolute;
  transform: translateX(100%);
  top: var(--padding-body);
  right: calc(var(--padding-body) * -1);
  transition: .3s;
}

.select-model-as-default {
  top: calc(var(--padding-body) + 55px);
  font-size: 13px;
  cursor: pointer;
  opacity: .8;
  transition: opacity .3s;

  &:hover {
    opacity: .5;
  }
}

.sidebar:not(.sidebar-chat) .new-chat-btn {
  position: relative;
  transform: none;
  top: 0;
  transition: .4s;
}

.sidebar__collapsed-item {
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  z-index: 1;
}

.sidebar.sidebar--opened {
  .new-chat-btn {
    right: var(--padding-body);
    transform: translateX(0);
  }
}

.settings-btn {
  margin-top: auto;
}

.chats-container {
  margin: 25px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-height: 0;
}

.chats-search-input {
  flex: 0;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100vh - 300px);
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.chat-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.date-divider {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface));
  font-size: 14px;
  font-weight: bold;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 8px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  margin-top: 5px;
}

.chat-item {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: rgba(var(--v-theme-background) / 20%);
  cursor: pointer;
  border-radius: 10px;
  width: 330px;
  height: 50px;

  &--selected {
    background-color: rgba(var(--v-theme-background) / 80%);
    transition: .2s;
  }

  &:hover {
    background-color: rgba(var(--v-theme-background) / 80%) !important;
  }

  &:not(.chat-item--selected):hover {
    background-color: rgba(var(--v-theme-background) / 60%) !important;
  }

  .delete-btn {
    position: absolute;
    right: 5px;
    opacity: 0;
    transition: .15s;
  }

  &:hover .delete-btn {
    opacity: 1;
  }
}

.chat-item span {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-item span.active {
  font-weight: bold;
}

.chat-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
