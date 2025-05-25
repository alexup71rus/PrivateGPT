import {computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';

export function useAppRouting() {
  const route = useRoute();
  const router = useRouter();

  const currentChatId = computed(() => route.hash.replace('#', ''));
  const isChatPage = computed(() => route.name === '/' || route.path === '/');

  const navigateWithHash = (chatId: string) => {
    return router.push({ path: '/', hash: `#${chatId}` });
  };

  return {
    isChatPage,
    currentChatId,
    navigateWithHash
  };
}
