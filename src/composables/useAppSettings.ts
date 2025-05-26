import {computed, reactive, watch} from 'vue';
import {DEFAULT_SETTINGS, type ISettings} from "@/types/settings.ts";

export function useAppSettings() {
  const saved = localStorage.getItem('privateGPTSettings');
  const parsed = saved ? JSON.parse(saved) : {};
  const settings: ISettings = reactive({ ...DEFAULT_SETTINGS, ...parsed });

  watch(
    settings,
    (newSettings) => {
      const current = localStorage.getItem('privateGPTSettings');
      const updated = JSON.stringify(newSettings);
      if (current !== updated) {
        localStorage.setItem('privateGPTSettings', updated);
      }
    },
    { deep: true }
  );

  const isDarkTheme = computed(() => settings.theme === 'dark');

  const updateSettings = (updates: Partial<ISettings>) => {
    Object.assign(settings, updates);
  };

  const resetSettings = () => {
    Object.assign(settings, { ...DEFAULT_SETTINGS });
  };

  return {
    settings,
    isDarkTheme,
    updateSettings,
    resetSettings,
  };
}
