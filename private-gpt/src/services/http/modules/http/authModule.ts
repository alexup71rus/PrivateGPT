import type {HttpModule} from '@/services/http'
import type {Ref} from 'vue'
import type {InternalAxiosRequestConfig} from "axios";

export function createAuthModule(isAuthRequired: Ref<boolean>): HttpModule {
  return {
    onRequest(config: InternalAxiosRequestConfig) {
      if ((config as any).skipAuth) return config

      const token = localStorage.getItem('token')
      if (!token) {
        isAuthRequired.value = true
        throw new Error('Токен отсутствует, требуется авторизация')
      }
      config.headers.Authorization = `Bearer ${token}`
      return config
    },
    onResponseError(error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        isAuthRequired.value = true
      }
      return Promise.reject(error)
    }
  }
}
