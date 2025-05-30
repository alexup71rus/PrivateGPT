<template>
  <div>
    <h1>{{ graphqlStore.helloMessage || 'Loading...' }}</h1>
    <v-btn @click="graphqlStore.fetchHello">Fetch Hello</v-btn>
    <div v-if="graphqlStore.loading">Loading...</div>
    <div v-if="graphqlStore.error">Error: {{ graphqlStore.error }}</div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useGraphQLStore } from '@/stores/graphql';

export default defineComponent({
  setup() {
    const graphqlStore = useGraphQLStore();
    return { graphqlStore };
  },
});
</script>
