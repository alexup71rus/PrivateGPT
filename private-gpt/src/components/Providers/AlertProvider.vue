<script setup lang="ts">
import { computed } from 'vue'
import { useAlert } from '@/plugins/alertPlugin'

const { alert, confirm, snackbar } = useAlert()

const alertIsOpen = computed({
  get: () => alert.value?.isOpen || false,
  set: v => {
    if (alert.value) alert.value.isOpen = v
  }
})

function clearAlert() {
  if (alert.value) alert.value = null
}

const confirmIsOpen = computed({
  get: () => confirm.value?.isOpen || false,
  set: v => {
    if (confirm.value) confirm.value.isOpen = v
  }
})

function clearConfirm() {
  if (confirm.value) confirm.value = null
}

const snackbarIsOpen = computed({
  get: () => snackbar.value?.isOpen || false,
  set: v => {
    if (snackbar.value) snackbar.value.isOpen = v
  }
})

function clearSnackbar() {
  if (snackbar.value) snackbar.value = null
}

function handleAlertClick(btn: any) {
  if (!alert.value) return
  if (btn instanceof Error) {
    alert.value.reject(btn)
  } else {
    alert.value.resolve(btn)
  }
  alertIsOpen.value = false
}

function handleConfirmClick(btn: any) {
  if (!confirm.value) return
  if (btn instanceof Error) {
    confirm.value.reject(btn)
  } else {
    confirm.value.resolve(btn)
  }
  confirmIsOpen.value = false
}

let _cachedColor = '';
function snackbarColor() {
  if (!snackbar.value) {
    queueMicrotask(() => {
      _cachedColor = ''
    })
    return _cachedColor;
  }

  if (snackbar.value.type === 'success') _cachedColor = 'success'
  if (snackbar.value.type === 'error') _cachedColor = 'error'
  if (snackbar.value.type === 'info') _cachedColor = 'primary'
  return _cachedColor
}
</script>

<template>
  <v-dialog
    v-model="alertIsOpen"
    persistent
    :style="alert?.width ? 'width:'+alert.width+'px;' : 'width: 600px;'"
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
          @click="handleAlertClick(b.value)"
        >
          {{ b.text }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="confirmIsOpen"
    persistent
    :style="confirm?.width ? 'width:'+confirm.width+'px;' : 'width: 600px;'"
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
          :color="b.color || 'primary'"
          @click="handleConfirmClick(b.value)"
        >
          {{ b.text }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="snackbarIsOpen"
    :color="snackbarColor()"
    :timeout="3000"
    @after-leave="clearSnackbar"
  >
    <strong v-if="snackbar?.title">{{ snackbar.title }}: </strong>{{ snackbar?.message }}
  </v-snackbar>
</template>
