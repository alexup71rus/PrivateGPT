export type MemoryEntry = { id?: number; text: string; timestamp: number };

export interface ChatModel {
  name: string;
}

export interface Attachment { content: string, type: 'text' | 'image', meta: File }

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
  timestamp?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}
