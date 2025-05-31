<script lang="ts" setup>
  import { useAlert } from '@/plugins/alertPlugin';

  const { showSnackbar } = useAlert();

  const showPlaceholder = () => {
    showSnackbar({ message: 'RAG settings are under development', type: 'info' });
  };
</script>

<template>
  <v-card-title class="text-h6 pb-2">
    RAG System
  </v-card-title>
  <v-card-text>
    <v-alert class="mb-4" type="info">
      RAG settings are under development
    </v-alert>
    <v-btn block color="primary" variant="solo-filled" @click="showPlaceholder">Check Status</v-btn>
  </v-card-text>
  <v-card-actions>
    <v-col>
      <v-btn block color="primary" variant="solo-filled" @click="showPlaceholder">Check Status</v-btn>
    </v-col>
  </v-card-actions>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}
</style>
