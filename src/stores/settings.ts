import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { DEFAULT_SETTINGS, type ISettings } from '@/types/settings.ts';

export const useSettingsStore = defineStore('settings', {
  state: () => {
    // Загружаем настройки из localStorage или используем значения по умолчанию
    const saved = localStorage.getItem('privateGPTSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    const settings: ISettings = reactive({ ...DEFAULT_SETTINGS, ...parsed });

    return {
      settings,
    };
  },
  getters: {
    isDarkTheme: (state) => computed(() => state.settings.theme === 'dark'),
  },
  actions: {
    updateSettings(updates: Partial<ISettings>) {
      // Обновляем реактивный объект настроек
      Object.assign(this.settings, updates);
      // Сохраняем в localStorage
      try {
        localStorage.setItem('privateGPTSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
    resetSettings() {
      // Сбрасываем настройки до значений по умолчанию
      Object.assign(this.settings, { ...DEFAULT_SETTINGS });
      // Сохраняем в localStorage
      try {
        localStorage.setItem('privateGPTSettings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    },
    selectModel(model: string) {
      // Специфичная акция для обновления selectedModel
      if (!model) {
        console.warn('selectModel called with invalid model:', model);
        return;
      }
      this.updateSettings({ selectedModel: model });
    },
  },
});
