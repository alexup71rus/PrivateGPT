export type MemoryEntry = { text: string; timestamp: number };

export interface ChatModel {
  name: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}
