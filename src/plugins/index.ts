/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import vuetify from './vuetify'
import router from '../router'
import pinia from '../stores'
import {createAlertPlugin} from "@/plugins/alertPlugin.ts";
import httpPlugin from "@/plugins/httpPlugin.ts";

// Types
import type { App } from 'vue'
import createSettingsPlugin from "@/plugins/settingsPlugin.ts";

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(createAlertPlugin())
    .use(createSettingsPlugin())
    .use(httpPlugin);
}
