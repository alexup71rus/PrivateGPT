<script setup lang="ts">
  import { computed } from 'vue';
  import { useAlert } from '@/plugins/alertPlugin';

  interface Button {
    text: string;
    color?: string;
    value: unknown;
  }

  interface AlertState {
    title?: string;
    message: string;
    width?: string | number;
    buttons: Button[];
    isOpen: boolean;
    resolve: (value: unknown) => void;
    reject: (value: unknown) => void;
  }

  interface SnackbarState {
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    actions?: Record<string, () => void>;
    isOpen: boolean;
  }

  const { alert, confirm, snackbar } = useAlert();

  const alertIsOpen = computed({
    get: () => alert.value?.isOpen || false,
    set: v => {
      if (alert.value) alert.value.isOpen = v;
    },
  });

  function clearAlert () {
    if (alert.value) alert.value = null;
  }

  const confirmIsOpen = computed({
    get: () => confirm.value?.isOpen || false,
    set: v => {
      if (confirm.value) confirm.value.isOpen = v;
    },
  });

  function clearConfirm () {
    if (confirm.value) confirm.value = null;
  }

  const snackbarIsOpen = computed({
    get: () => snackbar.value?.isOpen || false,
    set: v => {
      if (snackbar.value) snackbar.value.isOpen = v;
    },
  });

  function clearSnackbar () {
    if (snackbar.value) snackbar.value = null;
  }

  function handleAlertClick (btn: Button) {
    if (!alert.value) return;
    if (btn instanceof Error) {
      alert.value.reject(btn);
    } else {
      alert.value.resolve(btn.value);
    }
    alertIsOpen.value = false;
  }

  function handleConfirmClick (btn: Button) {
    if (!confirm.value) return;
    if (btn instanceof Error) {
      confirm.value.reject(btn);
    } else {
      confirm.value.resolve(btn.value);
    }
    confirmIsOpen.value = false;
  }

  function handleSnackbarAction (action: string) {
    if (!snackbar.value || !snackbar.value.actions) return;
    const actionFn = snackbar.value.actions[action];
    if (actionFn) actionFn();
    snackbarIsOpen.value = false;
  }

  let _cachedColor = '';
  function snackbarColor () {
    if (!snackbar.value) {
      queueMicrotask(() => {
        _cachedColor = '';
      });
      return _cachedColor;
    }

    if (snackbar.value.type === 'success') _cachedColor = 'success';
    else if (snackbar.value.type === 'error') _cachedColor = 'error';
    else if (snackbar.value.type === 'info') _cachedColor = 'primary';
    else if (snackbar.value.type === 'warning') _cachedColor = 'warning';
    else _cachedColor = '';
    return _cachedColor;
  }
</script>

<template>
  <v-dialog
    v-model="alertIsOpen"
    persistent
    :style="alert?.width ? `width:${alert.width}px;` : 'width: 600px;'"
    @after-leave="clearAlert"
  >
    <v-card>
      <v-card-title v-if="alert?.title">
        {{ alert.title }}
      </v-card-title>
      <v-card-text>{{ alert?.message }}</v-card-text>
      <v-card-actions>
        <v-btn
          v-for="(b, i) in alert?.buttons"
          :key="i"
          :color="b.color || 'primary'"
          @click="handleAlertClick(b)"
        >
          {{ b.text }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="confirmIsOpen"
    persistent
    :style="confirm?.width ? `width:${confirm.width}px;` : 'width: 600px;'"
    @after-leave="clearConfirm"
  >
    <v-card>
      <v-card-title v-if="confirm?.title">
        {{ confirm.title }}
      </v-card-title>
      <v-card-text>{{ confirm?.message }}</v-card-text>
      <v-card-actions>
        <v-btn
          v-for="(b, j) in confirm?.buttons"
          :key="j"
          :color="b.color ?? 'primary'"
          @click="handleConfirmClick(b)"
        >
          {{ b.text }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="snackbarIsOpen"
    :color="snackbarColor()"
    location="top right"
    :timeout="snackbar?.actions ? -1 : 3000"
    @after-leave="clearSnackbar"
  >
    <div class="snackbar-content">
      <div class="snackbar-message">
        <strong v-if="snackbar?.title">{{ snackbar.title }}: </strong>{{ snackbar?.message }}
      </div>
      <v-card-actions v-if="snackbar?.actions">
        <v-btn
          v-for="(action, key) in snackbar?.actions"
          :key="key"
          class="snackbar-button"
          :color="key.toLowerCase() === 'no' || key.toLowerCase() === 'cancel' ? 'secondary' : 'primary'"
          variant="text"
          @click="handleSnackbarAction(key)"
        >
          {{ key }}
        </v-btn>
      </v-card-actions>
    </div>
  </v-snackbar>
</template>

<style lang="scss" scoped>
.snackbar-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 100%;
  color: white;

  .snackbar-message {
    word-break: break-word;
    color: var(--v-theme-primary);
  }

  .snackbar-button {
    text-transform: capitalize;
    font-weight: 500;
    color: white !important;
    border-radius: 4px;
    transition: background-color 0.2s;

    &.text-primary {
      color: white !important;
      background-color: var(--v-theme-primary);
      &:hover {
        background-color: var(--v-theme-primary);
      }
    }

    &.text-secondary {
      color: white !important;
      background-color: var(--v-theme-secondary);
      opacity: .6;
      &:hover {
        background-color: var(--v-theme-secondary);
      }
    }
  }
}
</style>
