import type { HttpModule } from '@/services/http'
import { useAlert } from '@/plugins/alertPlugin'

export function createSnackbarModule(): HttpModule {
  return {
    onResponse(response) {
      return response
    },
    onResponseError(error) {
      const { showSnackbar } = useAlert();

      showSnackbar({
        title: 'Ошибка',
        message: error?.response?.data?.message || error.message || 'Ошибка запроса',
        type: ''
      })
      return Promise.reject(error)
    }
  }
}
