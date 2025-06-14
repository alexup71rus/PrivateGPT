import type { SystemPrompt } from '@/types/settings';

export enum AttachmentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface MemoryEntry {
  id?: number;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Attachment {
  content: string;
  type: AttachmentType;
  meta: File;
}

export interface AttachmentMeta {
  type: AttachmentType;
  name: string;
  size: number;
  lastModified: number;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  attachmentMeta?: AttachmentMeta | null;
  attachmentContent?: string | null;
  isLoading?: boolean;
  thinkTime?: number;
  isThinking?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  timestamp: number;
  systemPrompt: SystemPrompt | null;
  messages: Message[];
}

export interface ChatModel {
  name: string;
}

export interface LinkContent {
  content: string;
  error: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  content?: string;
}

export interface ChatMeta {
  id: string;
  title?: string;
  timestamp?: number;
  systemPrompt?: string | null;
}
