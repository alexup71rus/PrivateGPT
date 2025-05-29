<script lang="ts" setup>
import type { AttachmentMeta } from '@/types/chats';
import { ref } from 'vue';

defineProps<{
  meta: AttachmentMeta;
  content: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <v-dialog
    class="attachment-preview"
    max-width="800px"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div v-if="meta.type === 'image'" class="image-preview">
      <img :src="`data:image/${meta.type.split('/')[1] || 'jpeg'};base64,${content}`" alt="Attachment" />
    </div>
    <pre
      v-else
      class="attachment-preview__preview"
    >{{ content }}</pre>
    <span class="attachment-preview__title">
      {{ meta.name }}
    </span>
  </v-dialog>
</template>

<style lang="scss" scoped>
.attachment-preview {
  &__title {
    display: inline-block;
    width: min-content;
    margin: 16px auto;
    padding: 4px 8px;
    text-align: center;
    background: rgb(var(--v-theme-background));
    border-radius: 50px;
  }
}

.image-preview {
  display: flex;
  justify-content: center;

  img {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 80%;
    object-fit: contain;
  }
}

.attachment-preview__preview {
  background-color: rgb(var(--v-theme-background));
  padding: 15px;
  border-radius: 5px;
  min-height: 200px;
  max-height: 600px;
  overflow: auto;
}
</style>
