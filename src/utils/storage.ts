import type { Chat, MemoryEntry } from '@/types/chats.ts';

export async function openDB (): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open('PrivateGPT', 1);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore('chats', { keyPath: 'id' });
      db.createObjectStore('memory', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result as IDBDatabase);
    request.onerror = () => reject(request.error);
  });
}

export async function loadChats (): Promise<Chat[]> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['chats'], 'readonly');
    const store: IDBObjectStore = transaction.objectStore('chats');
    const request: IDBRequest<Chat[]> = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(
        (request.result || [])
          .sort((a, b) => b.timestamp - a.timestamp)
      );
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading chats from IndexedDB:', error);
    const chats = localStorage.getItem('privateGPTChats');
    if (chats) {
      const result: Chat[] = JSON.parse(chats);
      await saveChats(result);
      localStorage.removeItem('privateGPTChats');
      return result;
    }
    return [];
  }
}

export async function saveChats (chats: Chat[]): Promise<void> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['chats'], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore('chats');

    for (const chat of chats) {
      // Ensure chat is serializable by cloning and removing non-serializable properties
      const serializableChat = {
        ...chat,
        messages: chat.messages.map(message => ({
          ...message,
          attachmentMeta: message.attachmentMeta
            ? {
              type: message.attachmentMeta.type,
              name: message.attachmentMeta.name,
              size: message.attachmentMeta.size,
              lastModified: message.attachmentMeta.lastModified,
            }
            : undefined,
        })),
      };
      await new Promise<void>((resolve, reject) => {
        const request: IDBRequest = store.put(serializableChat);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Commit transaction
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving chats to IndexedDB:', error);
    throw error;
  }
}

export async function saveChat (chat: Chat): Promise<void> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['chats'], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore('chats');

    // Ensure chat is serializable
    const serializableChat = JSON.parse(JSON.stringify({
      ...chat,
      messages: chat.messages.map(message => ({
        ...message,
      })),
    }));

    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest = store.put(serializableChat);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving chat to IndexedDB:', error);
    throw error;
  }
}

export async function deleteChat (chatId: string): Promise<void> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['chats'], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore('chats');
    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest = store.delete(chatId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting chat from IndexedDB:', error);
    throw error;
  }
}

export async function clearAllChats (): Promise<void> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['chats'], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore('chats');
    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing chats from IndexedDB:', error);
    throw error;
  }
}

export async function loadMemory (): Promise<MemoryEntry[]> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['memory'], 'readonly');
    const store: IDBObjectStore = transaction.objectStore('memory');
    const request: IDBRequest<MemoryEntry[]> = store.getAll();
    return new Promise<MemoryEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading memory from IndexedDB:', error);
    const memory = localStorage.getItem('privateGPTMemory');
    if (memory) {
      const result: MemoryEntry[] = JSON.parse(memory);
      await saveMemory(result);
      localStorage.removeItem('privateGPTMemory');
      return result;
    }
    return [];
  }
}

export async function saveMemory (memory: MemoryEntry[]): Promise<void> {
  try {
    const db: IDBDatabase = await openDB();
    const transaction: IDBTransaction = db.transaction(['memory'], 'readwrite');
    const store: IDBObjectStore = transaction.objectStore('memory');
    await new Promise<void>((resolve, reject) => {
      const request: IDBRequest = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    for (const entry of memory) {
      await new Promise<void>((resolve, reject) => {
        const request: IDBRequest = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Error saving memory to IndexedDB:', error);
    throw error;
  }
}
