import { ref } from 'vue';

export function useDeleteButton(onDelete: (id: string) => Promise<void>) {
  const isDeletePending = ref<string | null>(null);

  const handleFirstClick = (id: string) => {
    isDeletePending.value = id;
  };

  const handleSecondClick = async (id: string) => {
    if (isDeletePending.value === id) {
      await onDelete(id);
      isDeletePending.value = null;
    }
  };

  const resetDeletePending = () => {
    isDeletePending.value = null;
  };

  const isPending = (id: string) => isDeletePending.value === id;

  return {
    isDeletePending,
    handleFirstClick,
    handleSecondClick,
    resetDeletePending,
    isPending,
  };
}
