<script lang="ts" setup>
import {useChatStore} from "@/stores/chat.ts";
import {computed, onMounted, ref} from "vue";
import {useAppSettings} from "@/composables/useAppSettings.ts";
import {useRouter} from "vue-router";
import {useChatActions} from "@/composables/useChatActions.ts";
import Logo from "@/assets/logo.svg";
import type {ChatModel} from "@/types/chats.ts";
import {useAppStore} from "@/stores/app.ts";

const props = defineProps<{
  isChatPage: boolean;
}>();

const router = useRouter();
const app = useAppStore();
const chat = useChatStore();
const { settings, updateSettings } = useAppSettings();
const { onNewChat, selectChat, deleteChat } = useChatActions();

const modelNames = computed(() => chat.models?.map((model: ChatModel) => model.name) || []);
const selectedModel = ref(settings.defaultModel);

const isChangedModel = computed(() => {
  return selectedModel.value !== settings.defaultModel;
});

const setDefaultModel = () => {
  if (selectedModel.value) {
    updateSettings({ defaultModel: selectedModel.value });
  }
};

const toggleSettings = () => {
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

onMounted(initializeChat);
</script>

<template>
  <div :class="['sidebar', { 'sidebar--opened': app.isAsideOpen, 'sidebar-chat': isChatPage }]">
    <div class="sidebar__collapsed-item">
      <v-btn
        :icon="app.isAsideOpen ? 'mdi-backburger' : 'mdi-menu'"
        @click="app.setAside(!app.isAsideOpen)"
      />
      <Logo v-show="app.isAsideOpen" class="sidebar__logo" />
      <v-btn class="new-chat-btn" icon="mdi-autorenew" @click="onNewChat" />
    </div>
    <template v-if="isChatPage">
      <v-autocomplete
        v-model="selectedModel"
        :items="modelNames"
        class="models-autocomplete"
        label="Модель"
        variant="solo-inverted"
      ></v-autocomplete>
      <a
        v-if="isChangedModel"
        class="select-model-as-default"
        @click="setDefaultModel"
      >
        Установить по умолчанию
      </a>
    </template>

    <transition name="fade">
      <div v-if="app.isAsideOpen && isChatPage" class="chat-list">
        <div
          v-for="_chat in chat.chats"
          :key="_chat.id"
          :class="['chat-item', { 'chat-item--selected': chat.activeChatId === _chat.id }]"
          @click="selectChat(_chat.id)"
        >
          <span>{{ _chat.title }}</span>
          <v-btn icon="mdi-delete" size="small" @click.stop="deleteChat(_chat.id)" />
        </div>
      </div>
    </transition>

    <v-btn
      :color="!isChatPage ? 'blue' : ''"
      class="settings-btn"
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
  transition: .4s;
}

.sidebar__collapsed-item {
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
}

.sidebar.sidebar--opened {
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
    background-color: rgba(var(--v-theme-background) / 80%);
    transition: .2s;
  }

  &:hover {
    background-color: rgba(var(--v-theme-background) / 80%) !important;
  }

  &:not(.chat-item--selected):hover {
    background-color: rgba(var(--v-theme-background) / 60%) !important;
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
