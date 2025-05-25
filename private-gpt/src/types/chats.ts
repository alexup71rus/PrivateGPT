export type MemoryEntry = { text: string; timestamp: number };

export interface ChatModel {
  name: string;
}

export type AttachmentMeta = {
  type: 'text' | 'image';
  name: string;
  size: number;
  lastModified: number;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  attachmentMeta?: AttachmentMeta;
  attachmentContent?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}
