<script lang="ts" setup>
import type { AttachmentMeta } from '@/types/chats';
import { ref } from 'vue';
import { formatFileSize } from '@/utils/chatUtils';

const props = defineProps<{
  meta: AttachmentMeta;
  content: string;
}>();

const isPreviewOpen = ref(false);
const fileSize = (size: number | undefined) => formatFileSize(size);
</script>

<template>
  <v-chip
    :prepend-icon="meta.type === 'text' ? 'mdi-file-document' : 'mdi-file-image'"
    @click="isPreviewOpen = true"
  >
    {{ meta.name }} [{{ fileSize(meta.size) }}]
  </v-chip>
  <AttachmentPreview
    v-model="isPreviewOpen"
    :meta="meta"
    :content="content"
  />
</template>

<style lang="scss" scoped>
.v-chip {
  cursor: pointer;
}
</style>
