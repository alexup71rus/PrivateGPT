import { getGraphQLClient, handleGraphQLError } from '@/utils/graphql';
import { gql } from 'graphql-tag';
import { AttachmentType, type Chat, type MemoryEntry } from '@/types/chats.ts';

export async function waitForBackend (maxRetries = 10, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await checkBackendHealth();
      return;
    } catch {
      if (attempt === maxRetries) {
        throw new Error('Backend is not available after maximum retries');
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function checkBackendHealth () {
  const client = await getGraphQLClient();
  const query = `
    query {
      healthCheck
    }
  `;

  await client.request(query);
}

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

// Unused. Why?
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
              type: message.attachmentMeta.type === AttachmentType.TEXT ? AttachmentType.TEXT : AttachmentType.IMAGE,
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
            type: message.attachmentMeta.type === AttachmentType.TEXT ? AttachmentType.TEXT : AttachmentType.IMAGE,
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

export async function loadMemory (): Promise<MemoryEntry[]> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query {
        getMemory {
          id
          content
          createdAt
          updatedAt
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

export async function saveMemory (memory: MemoryEntry[]): Promise<MemoryEntry[]> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation SaveMemoryEntries($entries: [MemoryEntryInput!]!) {
        saveMemoryEntries(entries: $entries) {
          id
          content
          createdAt
          updatedAt
        }
      }
    `;
    const { saveMemoryEntries } = await client.request<{ saveMemoryEntries: MemoryEntry[] }>(mutation, {
      entries: memory.map(entry => ({
        id: entry.id,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    });
    return saveMemoryEntries || [];
  } catch (error) {
    handleGraphQLError(error);
    throw error;
  }
}

export async function deleteMemoryEntry (id: number): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation DeleteMemoryEntry($id: Int!) {
        deleteMemoryEntry(id: $id)
      }
    `;
    await client.request(mutation, { id }, {
      fetchPolicy: 'no-cache',
    });
  } catch (error) {
    handleGraphQLError(error);
    throw error;
  }
}

export async function searchBackend (query: string, url: string, format: string): Promise<string | null> {
  try {
    const client = await getGraphQLClient();
    const gqlQuery = gql`
      query Search($query: String!, $url: String!, $format: String!) {
        search(query: $query, url: $url, format: $format) {
          results
        }
      }
    `;
    const { search } = await client.request<{ search: { results: string } }>(gqlQuery, { query, url, format });

    return search.results || null;
  } catch (error) {
    handleGraphQLError(error);
    return null;
  }
}
