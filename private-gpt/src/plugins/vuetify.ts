/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import {createVuetify} from 'vuetify'
import {useAppSettings} from "@/composables/useAppSettings.ts";

const { isDarkTheme } = useAppSettings();

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: isDarkTheme ? 'dark' : 'light',
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
})
