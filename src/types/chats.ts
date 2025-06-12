import type { SystemPrompt } from '@/types/settings';

export interface MemoryEntry {
  id?: number;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export enum AttachmentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
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
  messages: Message[];
  timestamp: number;
  systemPrompt: SystemPrompt | null;
}

export interface ChatModel {
  name: string;
}

export interface LinkContent {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  error?: string;
}
