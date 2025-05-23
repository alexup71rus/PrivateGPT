import {inject, type Ref, ref} from 'vue'
import { HttpService } from '@/services/http'
import { createSnackbarModule } from '@/services/http/modules/http/snackbarModule'
import { createAuthModule } from "@/services/http/modules/http/authModule";

const isAuthRequired = ref(false)

export function createHttpService() {
  const http = new HttpService(import.meta.env.VITE_API_URL)

  http.useModule(createSnackbarModule())
  http.useModule(createAuthModule(isAuthRequired))

  return { http, isAuthRequired }
}

export function useHttpService() {
  const service = inject<{ http: HttpService; isAuthRequired: Ref<boolean> }>('http')
  if (!service) {
    throw new Error('HttpService не найден! Убедись, что httpPlugin установлен в app.use()')
  }
  return service
}

export default {
  install(app) {
    const { http, isAuthRequired } = createHttpService()
    app.provide('http', { http, isAuthRequired })
    app.config.globalProperties.$http = http
  }
}
