<template>
  <div>
    <v-btn @click="handleSaveChat">Save Chat</v-btn>
    <v-btn @click="graphqlStore.fetchChats">Fetch Chats</v-btn>
    <div v-if="graphqlStore.loading">Loading...</div>
    <div v-if="graphqlStore.error">Error: {{ graphqlStore.error }}</div>
    <pre>
      {{ graphqlStore.chats }}
    </pre>
  </div>
</template>

<script lang="ts" setup>
  import { useGraphQLStore } from '@/stores/graphql';
  import type { Chat } from '@/types/chats.ts';

  const graphqlStore = useGraphQLStore();

  const handleSaveChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: 'Новый чат',
      timestamp: Date.now(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'Привет',
          timestamp: Date.now(),
        },
      ],
    };
    graphqlStore.saveChat(newChat);
  };
</script>
