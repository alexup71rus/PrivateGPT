<script lang="ts" setup>
  import { useChatStore } from '@/stores/chat.ts';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useChatActions } from '@/composables/useChatActions.ts';
  import { useAppStore } from '@/stores/app.ts';
  import { useAlert } from '@/plugins/alertPlugin.ts';
  import { useDeleteButton } from '@/composables/useDeleteButton.ts';
  import type { Chat } from '@/types/chats.ts';
  import { useSettingsStore } from '@/stores/settings.ts';
  import { formatDate } from '../../utils/chatUtils.ts';

  const props = defineProps<{
    isChatPage: boolean;
  }>();

  const route = useRoute();
  const router = useRouter();
  const app = useAppStore();
  const chat = useChatStore();
  const settingsStore = useSettingsStore();
  const { showSnackbar, showConfirm } = useAlert();
  const { onNewChat, selectChat, deleteChat } = useChatActions();
  const { handleFirstClick, handleSecondClick, resetDeletePending, isPending } = useDeleteButton(deleteChat);

  const searchQuery = ref<string>('');
  const selectedPromptFilter = ref<string | null>(null);

  const groupedChats = computed(() => {
    const groups: { [key: string]: Chat[] } = {};
    const sortedChats = [...chat.chats]
      .filter(chat => {
        const matchesSearch = chat.title.toLowerCase().includes(searchQuery.value?.toLowerCase() || '');
        const matchesPrompt = selectedPromptFilter.value
          ? chat.systemPrompt?.title === selectedPromptFilter.value
          : true;
        return matchesSearch && matchesPrompt;
      })
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

  const menuItems = [
    { title: 'General', path: '/settings', icon: 'mdi-cog' },
    { title: 'Search', path: '/settings/search', icon: 'mdi-magnify' },
    { title: 'Memory', path: '/settings/memory', icon: 'mdi-memory' },
    { title: 'RAG', path: '/settings/rag', icon: 'mdi-database' },
  ];
  const isActive = (path: string) => route.path === path;

  const handleChatClick = (id: string) => {
    selectChat(id);
  };

  const toggleSettings = async () => {
    if (props.isChatPage) {
      router.push(`/settings`);
    } else {
      if (!chat.chats?.length) {
        await chat.fetchChats();
      }

      const activeChat = chat.activeChat;

      if (activeChat) {
        router.push(`/#${activeChat.id}`);
      } else if (chat.chats[chat.chats.length - 1].messages.length === 0) {
        selectChat(chat.chats[chat.chats.length - 1].id);
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
      title: 'Warning',
      message: 'Are you sure you want to delete all chats?',
      buttons: [
        { text: 'Yes', color: 'warning', value: true },
        { text: 'Cancel', color: 'white', value: false },
      ],
      resolve: res => {
        if (res) {
          chat.clearChats();
          showSnackbar({ message: 'All chats deleted successfully', type: 'success' });
        }
      },
    });
  };

  const clearPromptFilter = () => {
    selectedPromptFilter.value = null;
  };

  const setPromptFilter = (promptTitle: string) => {
    selectedPromptFilter.value = promptTitle;
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
      <div v-if="app.isAsideOpen" class="chats-container">
        <template v-if="isChatPage">
          <v-text-field
            v-model="searchQuery"
            class="chats-search-input"
            clearable
            hide-details="auto"
            label="Search"
            variant="solo-inverted"
          >
            <template #append-inner>
              <v-btn
                v-tooltip="'Remove all chats'"
                color="red"
                icon="mdi-trash-can"
                variant="plain"
                @click="removeAllChats"
              />
            </template>
          </v-text-field>

          <div class="prompt-filters">
            <div
              :class="['prompt-filter-item', { 'prompt-filter-item--selected': !selectedPromptFilter }]"
              :style="{ opacity: !selectedPromptFilter ? 0.3 : 1 }"
              @click="clearPromptFilter"
            >
              <v-icon
                :color="selectedPromptFilter ? 'red' : ''"
              >
                mdi-close-circle
              </v-icon>
              <span>Clear Filter</span>
            </div>
            <div
              v-for="prompt in settingsStore.settings.systemPrompts"
              :key="prompt.title"
              :class="['prompt-filter-item', { 'prompt-filter-item--selected': selectedPromptFilter === prompt.title }]"
              @click="setPromptFilter(prompt.title)"
            >
              <v-icon>mdi-folder</v-icon>
              <span>{{ prompt.title }}</span>
            </div>
          </div>

          <div class="chats-list">
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
        </template>
        <template v-else>
          <div class="settings-list">
            <v-list density="compact">
              <v-list-item
                v-for="item in menuItems"
                :key="item.path"
                :active="isActive(item.path)"
                :prepend-icon="item.icon"
                :title="item.title"
                :value="item.path"
                @click="router.push(item.path)"
              />
            </v-list>
          </div>
        </template>
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

.prompt-filters {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prompt-filter-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: rgba(var(--v-theme-background) / 20%);
  cursor: pointer;
  border-radius: 10px;
  width: 330px;
  height: 50px;
  gap: 10px;

  &--selected {
    background-color: rgba(var(--v-theme-background) / 80%);
    transition: .2s;
  }

  &:hover {
    background-color: rgba(var(--v-theme-background) / 80%) !important;
  }

  &:not(.prompt-filter-item--selected):hover {
    background-color: rgba(var(--v-theme-background) / 60%) !important;
  }
}

.prompt-filter-item span {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100vh - 450px);
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
