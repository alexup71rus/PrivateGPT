import type {AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import axios from 'axios'

export class HttpService {
  private instance: AxiosInstance
  private abortControllers: Map<string, AbortController>
  private pendingRequests: Map<string, Promise<any>>

  constructor(baseURL: string) {
    this.instance = axios.create({ baseURL })
    this.abortControllers = new Map()
    this.pendingRequests = new Map()
  }

  useModule(module: HttpModule) {
    if (module.onRequest) {
      this.instance.interceptors.request.use(
        (config) => module.onRequest!(config),
        (error) => Promise.reject(error)
      )
    }
    if (module.onResponse || module.onResponseError) {
      this.instance.interceptors.response.use(
        (response) => (module.onResponse ? module.onResponse(response) : response),
        (error) => (module.onResponseError ? module.onResponseError(error) : Promise.reject(error))
      )
    }
  }

  async request<T = any>(config: AxiosRequestConfig & { requestId?: string }): Promise<T> {
    const requestId = config.requestId || (config.method || '') + (config.url || '')

    const existingRequest = this.pendingRequests.get(requestId)
    if (existingRequest) {
      return existingRequest
    }

    const controller = new AbortController()
    this.abortControllers.set(requestId, controller)

    try {
      const requestPromise = this.instance
        .request<T>({
          ...config,
          signal: controller.signal
        })
        .then((res) => res.data)

      this.pendingRequests.set(requestId, requestPromise)

      const result = await requestPromise

      return result
    } finally {
      this.pendingRequests.delete(requestId)
      this.abortControllers.delete(requestId)
    }
  }

  abortRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
      this.pendingRequests.delete(requestId)
    }
  }

  abortAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
    this.pendingRequests.clear()
  }
}

export interface HttpModule {
  onRequest?(config: AxiosRequestConfig): InternalAxiosRequestConfig
  onResponse?(response: AxiosResponse): AxiosResponse
  onResponseError?(error: any): Promise<any>
}
