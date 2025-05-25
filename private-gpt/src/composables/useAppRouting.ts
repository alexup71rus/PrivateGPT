import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function useAppRouting() {
  const route = useRoute();
  const isChatPage = computed(() => route.name === '/');

  return { isChatPage };
}
