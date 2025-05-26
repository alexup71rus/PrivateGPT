import { ref, type App } from 'vue'

const KEY = Symbol('alert-service')

let globalAlertService: any = null

export function createAlertPlugin() {
  const alert = ref<any>(null)
  const confirm = ref<any>(null)
  const snackbar = ref<any>(null)

  function showAlert(options: any) {
    const o = typeof options === 'string' ? { message: options } : options || {}
    if (!o.buttons) o.buttons = [{ text: 'OK', color: 'primary', value: true }]
    return new Promise((resolve, reject) => {
      alert.value = {
        title: o.title,
        message: o.message,
        width: o.width,
        buttons: o.buttons,
        isOpen: true,
        resolve,
        reject
      }
    })
  }

  function showConfirm(options: any) {
    const o = typeof options === 'string' ? { message: options } : options || {}
    if (!o.buttons) o.buttons = [
      { text: 'OK', color: 'primary', value: true },
      { text: 'Cancel', color: 'secondary', value: false }
    ]
    return new Promise((resolve, reject) => {
      confirm.value = {
        title: o.title,
        message: o.message,
        width: o.width,
        buttons: o.buttons,
        isOpen: true,
        resolve,
        reject
      }
    })
  }

  function showSnackbar(options: any) {
    const o = typeof options === 'string' ? { message: options } : options || {}
    snackbar.value = {
      title: o.title,
      message: o.message,
      type: o.type,
      isOpen: true,
    }
    setTimeout(() => {
      if (snackbar.value) snackbar.value = null
    }, 3000)
  }

  const alertService = { alert, confirm, snackbar, showAlert, showConfirm, showSnackbar }

  globalAlertService = alertService

  function install(app: App) {
    app.provide(KEY, alertService)
  }

  return { install }
}

export function useAlert() {
  if (globalAlertService) {
    return globalAlertService
  }
  throw new Error('useAlert must be used after createAlertPlugin')
}
