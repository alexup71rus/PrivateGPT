export type Theme = 'light' | 'dark';

export const DEFAULT_SETTINGS = {
  isAsideOpen: false as boolean,
  ////
  ollamaLink: 'http://localhost:11434' as string,
  selectedModel: '' as string,
  defaultModel: '' as string,
  defaultChatTitle: 'Новый чат' as string,
  theme: 'dark' as Theme,
  isSearchAsDefault: false as boolean,
  systemModel: 'llama3.2:latest',
  titlePrompt: 'You are an assistant that generates a concise chat title based on a user message and assistant response. Return a JSON object with a "title" field containing a short, descriptive title (max 50 characters) summarizing the conversation topic.' as string,
  memoryPrompt: `You are an assistant that extracts factual information about the user based on a short conversation.
Return a JSON object with a "facts" field — an array of short, self-contained facts about the user.
Example: {"facts": ["User has a cat named Barsik."]}.
If there are no strong facts, infer plausible general facts based on the conversation style, preferences, or topics.
Never return an empty array. Always provide at least one reasonable fact.` as string,
  /*
  If there are no strong facts, infer plausible general facts based on the conversation style, preferences, or topics.
  Never return an empty array. Always provide at least one reasonable fact.
  ---
  If there is no factual information, return an empty array.
  */
} as const;

export type ISettings = typeof DEFAULT_SETTINGS;
