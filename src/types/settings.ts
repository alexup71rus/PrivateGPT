export type Theme = 'light' | 'dark' | 'system';
export type SearchFormat = 'html' | 'json';

export const DEFAULT_SETTINGS = {
  isAsideOpen: false as boolean,
  /* --- */
  ollamaURL: 'http://localhost:11434' as string,
  selectedModel: '' as string,
  defaultModel: '' as string,
  memoryModel: '' as string,
  searchModel: '' as string,
  searxngURL: '' as string,
  searchFormat: 'json' as SearchFormat,
  defaultChatTitle: 'New chat' as string,
  theme: 'dark' as Theme,
  isSearchAsDefault: false as boolean,
  chatScrollMode: 'scroll' as 'gap' | 'scroll',
  systemPrompt: 'You are a helpful assistant',
  systemModel: 'llama3.2:latest',
  titlePrompt: 'Generate a concise chat title (2-5 words, up to 50 characters) summarizing the topic based on the provided messages. Use the same language as the user’s message. Include a relevant emoji only if it enhances clarity. Return the title as plain text. Examples:\n' +
  '- English: "🐍 Python Snake Game" for user: "Write a snake game in Python"\n' +
  '- Russian: "🐱 Вибриссы у котов" for user: "Как называются усы у котов?"\n' +
  '- French: "🇫🇷 Voyage à Paris" for user: "Plan a trip to Paris"\n' +
  '- Spanish: "🍜 Receta de Ramen" for user: "Escribe una receta de ramen"' +
  '- Spanish: "🍜 Receta de Ramen" for "Escribe una receta de ramen"' as string,
  memoryPrompt: 'Summarize one key piece of information (up to 50 characters) from the provided chat messages, capturing the user\'s preferences, background, interests, or discussion context. Use the same language as the user\'s messages. Focus on a concise, memorable detail or theme. Examples:\n' +
  '- English: "User explores TypeScript benefits." for a TypeScript chat\n' +
  '- Russian: "Пользователь интересуется вибриссами." for "Как называются усы у котов?"\n' +
  '- Spanish: "Usuario aprende frameworks JS." for a JS frameworks chat\n' +
  '- French: "Utilisateur passionné de voyage." for a travel chat' as string,
} as const;

export type ISettings = typeof DEFAULT_SETTINGS;
