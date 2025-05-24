<script setup lang="ts">
import { useChatStore } from "@/stores/chat.ts";
import { computed, onMounted, ref } from "vue";
import { useAppSettings } from "@/composables/useAppSettings.ts";
import { useRouter } from "vue-router";
import Logo from "@/assets/logo.svg";

const props = defineProps<{
  isChatPage: boolean
}>();

const router = useRouter();
const store = useChatStore();
const { settings, updateSettings } = useAppSettings();

const modelNames = computed(() => store.models?.map((model: any) => model.name) || []);
const selectedModel = ref(settings.defaultModel);

const isChangedModel = computed(() => {
  return selectedModel.value !== settings.defaultModel;
});

const setDefaultModel = () => {
  if (selectedModel.value) {
    updateSettings({ defaultModel: selectedModel.value });
  }
};

const onNewChat = () => {
  const activeChat = store.activeChat;
  let chat;

  if (activeChat && activeChat.messages.length === 0) {
    chat = activeChat;
  } else {
    chat = store.createChat();
  }

  router.push(`/#${chat.id}`);
};

const selectChat = (chatId: string) => {
  store.activeChatId = chatId;
  router.push(`/#${chatId}`);
};

const deleteChat = (chatId: string) => {
  if (store.chats.length === 1) {
    const chat = store.chats[0];
    chat.messages = [];
    chat.title = 'Новый чат';
    selectChat(chat.id);
  } else {
    store.deleteChat(chatId);
    if (store.chats.length > 0) {
      selectChat(store.chats[0].id);
    }
  }
};

const toggleSettings = () => {
  if (props.isChatPage) {
    router.push(`/settings`);
  } else {
    const activeChat = store.activeChat;

    if (activeChat) {
      router.push(`/#${activeChat.id}`);
    } else {
      onNewChat();
    }
  }
}

onMounted(() => {
  const hash = window.location.hash.slice(1);

  if (hash) {
    const chatExists = store.chats.some(chat => chat.id === hash);
    if (chatExists) {
      selectChat(hash);
      return;
    }
  }

  if (store.chats.length > 0) {
    selectChat(store.chats[0].id);
  }
});
</script>

<template>
  <div :class="['sidebar', {'sidebar--opened': store.isAsideOpen, 'sidebar-chat': isChatPage}]">
    <div class="sidebar__collapsed-item">
      <v-btn :icon="store.isAsideOpen ? 'mdi-backburger' : 'mdi-menu'" @click="store.setAside(!store.isAsideOpen)" />
      <Logo v-show="store.isAsideOpen" class="sidebar__logo" />
      <v-btn class="new-chat-btn" icon="mdi-autorenew" @click="onNewChat" />
    </div>
    <template v-if="isChatPage">
      <v-autocomplete
        class="models-autocomplete"
        label="Select a model"
        :items="modelNames"
        v-model="selectedModel"
        variant="solo-inverted"
      ></v-autocomplete>
      <a
        v-if="isChangedModel"
        class="select-model-as-default"
        @click="setDefaultModel"
      >Установить по умолчанию</a>
    </template>

    <transition name="fade">
      <div class="chat-list" v-if="store.isAsideOpen && isChatPage">
        <div
          v-for="chat in store.chats" :key="chat.id"
          :class="['chat-item', {'chat-item--selected': store.activeChatId === chat.id}]"
          @click="selectChat(chat.id)"
        >
          <span>
            {{ chat.title }}
          </span>
          <v-btn icon="mdi-delete" size="small" @click.stop="deleteChat(chat.id)" />
        </div>
      </div>
    </transition>

    <v-btn class="settings-btn" icon="mdi-wrench" :color="!isChatPage ? 'blue' : ''" @click="toggleSettings" />
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

  &__logo {
    position: absolute;
    left: 50%;
    top: var(--padding-body);
    height: 50px;
    transform: translateX(-50%);
    transition: .8s;
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

.select-model-as-default,
.models-autocomplete {
  position: absolute;
  transform: translateX(100%);
  top: calc(var(--padding-body) - 3px);
  right: -70px;
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  transition: .5s;
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
  left: 0;
}

.sidebar.sidebar--opened {
  .sidebar__collapsed-item {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .new-chat-btn {
    right: var(--padding-body);
    transform: translateX(0);
  }

  .models-autocomplete {
    right: calc(var(--padding-body) * -1);
  }
}

.settings-btn {
  margin-top: auto;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 30px;
  max-height: 400px;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: rgba(var(--v-theme-background) / 20%);
  cursor: pointer;
  border-radius: 10px;
  width: 330px;

  &--selected {
    background-color: rgba(var(--v-theme-background) / 60%);
    transition: .2s;
  }

  &:hover {
    background-color: rgba(var(--v-theme-background) / 40%) !important;
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

/* Transition styles for chat-list */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
