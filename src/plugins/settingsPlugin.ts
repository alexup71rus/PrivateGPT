import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import {useSettingsStore} from "@/stores/settings.ts";

export default function createSettingsPlugin() {
  const settingsStore = useSettingsStore();

  return createVuetify({
    theme: {
      defaultTheme: settingsStore.isDarkTheme.value ? 'dark' : 'light',
      themes: {
        light: {
          colors: {
            surface: 'rgb(var(--v-theme-surface))',
            background: 'rgb(var(--v-theme-background))',
            'surface-variant': 'rgb(var(--v-theme-surface-variant))',
            'surface-bright': 'rgb(var(--v-theme-surface-bright))',
            primary: 'rgb(var(--v-theme-primary))',
            'on-surface': 'rgb(var(--v-theme-on-surface))',
          },
        },
        dark: {
          colors: {
            surface: 'rgb(var(--v-theme-surface))',
            background: 'rgb(var(--v-theme-background))',
            'surface-variant': 'rgb(var(--v-theme-surface-variant))',
            'surface-bright': 'rgb(var(--v-theme-surface-bright))',
            primary: 'rgb(var(--v-theme-primary))',
            'on-surface': 'rgb(var(--v-theme-on-surface))',
          },
        },
      },
    },
  });
}
