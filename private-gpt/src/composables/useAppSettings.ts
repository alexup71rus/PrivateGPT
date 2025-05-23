import { reactive, computed, watch } from 'vue';

export interface Settings {
  ollamaLink: string;
  selectedModel: string;
  defaultModel: string;
  temperature: number;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: Settings = {
  ollamaLink: 'http://localhost:11434',
  selectedModel: '',
  defaultModel: '',
  temperature: 0.7,
  theme: 'light',
} as const;

export function useAppSettings() {
  // Load initial settings from localStorage or use defaults
  const savedSettings = localStorage.getItem('privateGPTSettings');
  const settings: Settings = reactive(
    savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS }
  );

  // Save settings to localStorage on change
  watch(
    settings,
    (newSettings) => {
      localStorage.setItem('privateGPTSettings', JSON.stringify(newSettings));
    },
    { deep: true }
  );

  // Getter for dark theme
  const isDarkTheme = computed(() => settings.theme === 'dark');

  // Update settings
  const updateSettings = (updates: Partial<Settings>) => {
    Object.assign(settings, updates);
  };

  // Reset to default settings
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
