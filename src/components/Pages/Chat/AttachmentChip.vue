// components/AttachmentChip.vue
<script lang="ts" setup>
import type { AttachmentMeta } from '@/types/chats';
import { formatFileSize } from '@/utils/chatUtils';

const props = defineProps<{
  meta: AttachmentMeta;
}>();

const fileSize = (size: number | undefined) => formatFileSize(size);

const openPreview = () => {
  // Заглушка для модалки, можно будет реализовать позже
  console.log('Открытие предпросмотра для:', props.meta.name);
};
</script>

<template>
  <v-chip
    :prepend-icon="meta.type === 'text' ? 'mdi-file-document' : 'mdi-file-image'"
    @click="openPreview"
  >
    {{ meta.name }} [{{ fileSize(meta.size) }}]
  </v-chip>
</template>

<style lang="scss" scoped>
.v-chip {
  cursor: pointer; /* Для интерактивности при клике */
}
</style>
