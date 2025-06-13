import { getGraphQLClient, handleGraphQLError } from '@/utils/graphql';
import { gql } from 'graphql-tag';
import {
  AttachmentType,
  type Chat,
  type ChatMeta,
  type GraphQLPaginatedResponse,
  type LinkContent,
  type MemoryEntry,
  type Message,
  type PaginatedResponse,
  type SearchResultItem,
} from '@/types/chats.ts';

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

export async function loadChats (pagination?: { page?: number; perPage?: number }): Promise<PaginatedResponse<Chat>> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query GetChats($pagination: PaginationInput) {
        getChats(pagination: $pagination) {
          items {
            id
            title
            timestamp
            systemPrompt
          }
          total
          page
          perPage
          totalPages
        }
      }
    `;
    const { getChats } = await client.request<{ getChats: GraphQLPaginatedResponse<Chat> }>(query, { pagination });
    return {
      items: (getChats.items || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
      pagination: {
        total: getChats.total,
        page: getChats.page,
        perPage: getChats.perPage,
        totalPages: getChats.totalPages,
      },
    };
  } catch (error) {
    handleGraphQLError(error);
    return { items: [], pagination: { total: 0, page: 1, perPage: 0, totalPages: 0 } };
  }
}

export async function loadChatMessages (chatId: string, pagination?: { page?: number; perPage?: number }): Promise<PaginatedResponse<Message>> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query GetChatMessages($chatId: String!, $pagination: PaginationInput) {
        getChatMessages(chatId: $chatId, pagination: $pagination) {
          items {
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
          total
          page
          perPage
          totalPages
        }
      }
    `;
    const { getChatMessages } = await client.request<{ getChatMessages: GraphQLPaginatedResponse<Message> }>(query, { chatId, pagination });
    return {
      items: getChatMessages.items || [],
      pagination: {
        total: getChatMessages.total,
        page: getChatMessages.page,
        perPage: getChatMessages.perPage,
        totalPages: getChatMessages.totalPages,
      },
    };
  } catch (error) {
    handleGraphQLError(error);
    return { items: [], pagination: { total: 0, page: 1, perPage: 0, totalPages: 0 } };
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

export async function saveChatMeta (meta: ChatMeta): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation UpdateChatMeta($meta: ChatMetaInput!) {
        updateChatMeta(meta: $meta) {
          id
        }
      }
    `;
    const serializableMeta = JSON.parse(JSON.stringify({
      id: meta.id,
      title: meta.title ?? undefined,
      timestamp: meta.timestamp ?? undefined,
      systemPrompt: meta.systemPrompt ?? undefined,
    }));
    await client.request(mutation, { meta: serializableMeta });
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
        id: entry.id ?? undefined,
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

export async function searchBackend (
  query: string,
  url: string,
  format: 'html' | 'json',
  options?: { searchResultsLimit: number; followSearchLinks: boolean }
): Promise<SearchResultItem[] | null> {
  try {
    const client = await getGraphQLClient();
    const gqlQuery = gql`
      query Search($query: String!, $url: String!, $format: String!, $limit: Int, $followLinks: Boolean) {
        search(query: $query, url: $url, format: $format, limit: $limit, followLinks: $followLinks) {
          results
        }
      }
    `;
    const encodedQuery = encodeURIComponent(query);
    const { search } = await client.request<{ search: { results: string } }>(gqlQuery, {
      query: encodedQuery,
      url,
      format,
      limit: options?.searchResultsLimit,
      followLinks: options?.followSearchLinks,
    });

    return search.results ? JSON.parse(search.results) as SearchResultItem[] : null;
  } catch (error) {
    console.error('searchBackend error:', error);
    handleGraphQLError(error);
    return null;
  }
}

export async function fetchLinkContent (urls: string[]): Promise<LinkContent> {
  try {
    const client = await getGraphQLClient();
    const gqlQuery = gql`
      query FetchLinkContent($urls: [String!]!) {
        fetchLinkContent(urls: $urls) {
          content
          error
        }
      }
    `;
    const encodedUrls = urls.map(url => encodeURIComponent(url));
    const { fetchLinkContent } = await client.request<{ fetchLinkContent: LinkContent }>(gqlQuery, { urls: encodedUrls });
    return fetchLinkContent;
  } catch (error) {
    console.error('fetchLinkContent error:', error);
    handleGraphQLError(error);
    return { content: '', error: 'Failed to fetch link content' };
  }
}

export async function saveMessage (chatId: string, message: Message): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation SaveMessage($chatId: String!, $message: MessageInput!) {
        saveMessage(chatId: $chatId, message: $message) {
          id
        }
      }
    `;
    const serializableMessage = JSON.parse(JSON.stringify({
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
    }));
    await client.request(mutation, { chatId, message: serializableMessage });
  } catch (error) {
    handleGraphQLError(error);
  }
}

export async function deleteMessage (chatId: string, messageIds: string[]): Promise<void> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation DeleteMessage($chatId: String!, $messageIds: [String!]!) {
        deleteMessage(chatId: $chatId, messageIds: $messageIds)
      }
    `;
    await client.request(mutation, { chatId, messageIds });
  } catch (error) {
    handleGraphQLError(error);
  }
}
