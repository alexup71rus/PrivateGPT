export type Theme = 'light' | 'dark' | 'system';

export const DEFAULT_SETTINGS = {
  isAsideOpen: false as boolean,
  /* --- */
  ollamaURL: 'http://localhost:11434' as string,
  selectedModel: '' as string,
  systemModel: '' as string,
  memoryModel: '' as string,
  searchModel: '' as string,
  searxngURL: '' as string,
  defaultChatTitle: 'New chat' as string,
  theme: 'dark' as Theme,
  isSearchAsDefault: false as boolean,
  chatScrollMode: 'scroll' as 'gap' | 'scroll',
  systemPrompt: '',
  systemModel: 'llama3.2:latest',
  titlePrompt: 'You are an assistant that generates a concise chat title based on a user message and assistant response. Return a JSON object with a "title" field containing a short, descriptive title (max 50 characters) summarizing the conversation topic.' as string,
  memoryPrompt: `You are an AI assistant tasked with summarizing key factual information about the user from a short conversation for long-term memory storage. The conversation includes messages where "user" is the human and "assistant" is the AI. Your goal is to extract concise, self-contained facts about the user, focusing on their preferences, background, or notable details explicitly mentioned.

**Instructions:**
1. Return a JSON object with a single field "facts", which is an array of strings.
2. Each fact must be a short, standalone statement about the user (e.g., "User lives in New York.", "User prefers dark mode in apps.").
3. Only include facts explicitly supported by the conversation. If no clear facts are present, infer one or two plausible, general facts based on the conversation's tone, style, or context (e.g., "User is interested in programming." if they discuss coding).
4. Avoid speculative or overly vague facts (e.g., "User might like coffee.").
5. Ensure the facts are useful for long-term memory, focusing on stable user traits or preferences.
6. Return at least one fact, but limit to a maximum of three facts to keep the summary concise.

**Example Output:**
\`\`\`json
{
  "facts": [
    "User has a dog named Max.",
    "User works as a software developer.",
    "User prefers using Vue.js for frontend development."
  ]
}` as string,
} as const;

export type ISettings = typeof DEFAULT_SETTINGS;
