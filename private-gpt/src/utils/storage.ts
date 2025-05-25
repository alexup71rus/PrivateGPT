import type {Chat, MemoryEntry} from "@/types/chats.ts";

export function loadChats(): Chat[] {
  const raw = localStorage.getItem('privateGPTChats');
  return raw ? JSON.parse(raw) : [];
}

export function loadMemory(): MemoryEntry[] {
  const raw = localStorage.getItem('privateGPTMemory');
  return raw ? JSON.parse(raw) : [];
}
