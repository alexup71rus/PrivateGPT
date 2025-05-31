import { getGraphQLClient, handleGraphQLError } from '@/utils/graphql';
import { gql } from 'graphql-tag';
import type { Chat, MemoryEntry } from '@/types/chats.ts';

// Load all chats from the backend
export async function loadChats (): Promise<Chat[]> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query {
        getChats {
          id
          title
          timestamp
          messages {
            id
            content
            role
            timestamp
            attachmentMeta {
              type
              name
              size
              lastModified
            }
            attachmentContent
          }
        }
      }
    `;
    const { getChats } = await client.request<{ getChats: Chat[] }>(query);
    return (getChats || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (error) {
    handleGraphQLError(error);
    return [];
  }
}

// Save multiple chats to the backend
export async function saveChats (chats: Chat[]): Promise<void> {
  try {
    const client = await getGraphQLClient();
    for (const chat of chats) {
      const mutation = gql`
        mutation SaveChat($chat: ChatInput!) {
          saveChat(chat: $chat) {
            id
          }
        }
      `;
      // Ensure chat is serializable, exclude UI-specific fields
      const serializableChat = {
        id: chat.id,
        title: chat.title,
        timestamp: chat.timestamp,
        messages: chat.messages.map(message => ({
          id: message.id,
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          attachmentMeta: message.attachmentMeta
            ? {
              type: message.attachmentMeta.type,
              name: message.attachmentMeta.name,
              size: message.attachmentMeta.size,
              lastModified: message.attachmentMeta.lastModified,
            }
            : null,
          attachmentContent: message.attachmentContent || null,
        })),
      };
      await client.request(mutation, { chat: serializableChat });
    }
  } catch (error) {
    handleGraphQLError(error);
  }
}

// Save a single chat to the backend
export async function saveChat (chat: Chat): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation SaveChat($chat: ChatInput!) {
        saveChat(chat: $chat) {
          id
        }
      }
    `;
    // Ensure chat is serializable, exclude UI-specific fields
    const serializableChat = JSON.parse(JSON.stringify({
      id: chat.id,
      title: chat.title,
      timestamp: chat.timestamp,
      messages: chat.messages.map(message => ({
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        attachmentMeta: message.attachmentMeta
          ? {
            type: message.attachmentMeta.type,
            name: message.attachmentMeta.name,
            size: message.attachmentMeta.size,
            lastModified: message.attachmentMeta.lastModified,
          }
          : null,
        attachmentContent: message.attachmentContent || null,
      })),
    }));
    await client.request(mutation, { chat: serializableChat });
  } catch (error) {
    handleGraphQLError(error);
  }
}

// Delete a chat by ID
export async function deleteChat (chatId: string): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation DeleteChat($id: String!) {
        deleteChat(id: $id)
      }
    `;
    await client.request(mutation, { id: chatId });
  } catch (error) {
    handleGraphQLError(error);
  }
}

// Clear all chats
export async function clearAllChats (): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation {
        clearChats
      }
    `;
    await client.request(mutation);
  } catch (error) {
    handleGraphQLError(error);
  }
}

// Load memory entries from the backend
export async function loadMemory (): Promise<MemoryEntry[]> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query {
        getMemory {
          id
          content
          timestamp
        }
      }
    `;
    const { getMemory } = await client.request<{ getMemory: MemoryEntry[] }>(query);
    return getMemory || [];
  } catch (error) {
    handleGraphQLError(error);
    return [];
  }
}

// Save memory entries to the backend
export async function saveMemory (memory: MemoryEntry[]): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation SaveMemory($entries: [MemoryEntryInput!]!) {
        saveMemory(entries: $entries) {
          id
        }
      }
    `;
    await client.request(mutation, { entries: memory });
  } catch (error) {
    handleGraphQLError(error);
  }
}
