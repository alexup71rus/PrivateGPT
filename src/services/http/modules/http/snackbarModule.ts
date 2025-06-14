import type { HttpModule } from '@/services/http';
import { useAlert } from '@/plugins/alertPlugin';

export function createSnackbarModule (): HttpModule {
  return {
    onResponse (response) {
      return response
    },
    onResponseError (error) {
      const { showSnackbar } = useAlert();

      showSnackbar({
        title: 'Error',
        message: error?.response?.data?.message || error.message || 'Error query',
        type: '',
      })
      return Promise.reject(error)
    },
  }
}
