import { defineStore } from 'pinia';
import { getGraphQLClient } from '@/utils/graphql';
import { gql } from 'graphql-tag';

export const useGraphQLStore = defineStore('graphql', {
  state: () => ({
    helloMessage: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchHello() {
      this.loading = true;
      this.error = null;

      try {
        const client = await getGraphQLClient();
        const query = gql`
          query {
            sayHello
          }
        `;
        const data: any = await client.request(query);
        this.helloMessage = data.sayHello;
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
