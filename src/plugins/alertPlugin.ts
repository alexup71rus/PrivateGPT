import { type App, ref, type Ref } from 'vue';

interface Button {
  text: string;
  color?: string;
  value: unknown;
}

interface AlertOptions {
  title?: string;
  message: string;
  width?: string | number;
  buttons?: Button[];
  resolve?: (value: unknown) => void;
  reject?: (value: unknown) => void;
}

interface ConfirmOptions extends AlertOptions {}

interface SnackbarOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  actions?: Record<string, () => void>;
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

const KEY = Symbol('alert-service');

interface AlertService {
  alert: Ref<AlertState | null>;
  confirm: Ref<AlertState | null>;
  snackbar: Ref<SnackbarState | null>;
  showAlert: (options: AlertOptions | string) => Promise<unknown>;
  showConfirm: (options: ConfirmOptions | string) => Promise<unknown>;
  showSnackbar: (options: SnackbarOptions | string) => void;
}

let globalAlertService: AlertService | null = null;

export function createAlertPlugin () {
  const alert = ref<AlertState | null>(null);
  const confirm = ref<AlertState | null>(null);
  const snackbar = ref<SnackbarState | null>(null);

  function showAlert (options: AlertOptions | string) {
    const o: AlertOptions = typeof options === 'string' ? { message: options } : options ?? {};
    const buttons: Button[] = o.buttons ?? [{ text: 'OK', color: 'primary', value: true }];

    return new Promise((resolve, reject) => {
      alert.value = {
        title: o.title,
        message: o.message,
        width: o.width,
        buttons,
        isOpen: true,
        resolve: (value: unknown) => {
          resolve(value);
          if (o.resolve) o.resolve(value);
        },
        reject: (value: unknown) => {
          reject(value);
          if (o.reject) o.reject(value);
        },
      };
    });
  }

  function showConfirm (options: ConfirmOptions | string) {
    const o: ConfirmOptions = typeof options === 'string' ? { message: options } : options ?? {};
    const buttons: Button[] = o.buttons ?? [
      { text: 'OK', color: 'primary', value: true },
      { text: 'Cancel', color: 'secondary', value: false },
    ];

    return new Promise((resolve, reject) => {
      confirm.value = {
        title: o.title,
        message: o.message,
        width: o.width,
        buttons,
        isOpen: true,
        resolve: (value: unknown) => {
          resolve(value);
          if (o.resolve) o.resolve(value);
        },
        reject: (value: unknown) => {
          reject(value);
          if (o.reject) o.reject(value);
        },
      };
    });
  }

  function showSnackbar (options: SnackbarOptions | string) {
    const o: SnackbarOptions = typeof options === 'string' ? { message: options } : options ?? {};
    snackbar.value = {
      title: o.title,
      message: o.message,
      type: o.type,
      actions: o.actions,
      isOpen: true,
    };
    if (!o.actions) {
      setTimeout(() => {
        if (snackbar.value) snackbar.value = null;
      }, 3000);
    }
  }

  const alertService: AlertService = { alert, confirm, snackbar, showAlert, showConfirm, showSnackbar };

  globalAlertService = alertService;

  function install (app: App) {
    app.provide(KEY, alertService);
  }

  return { install };
}

export function useAlert (): AlertService {
  if (!globalAlertService) {
    throw new Error('useAlert must be used after createAlertPlugin');
  }
  return globalAlertService;
}
