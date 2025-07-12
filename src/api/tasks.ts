import { gql } from 'graphql-tag';
import { type DocumentNode } from 'graphql';
import { getGraphQLClient, handleGraphQLError } from '@/utils/graphql';
import { type Event } from '@/types/tasks';

export const NOTIFICATION_TRIGGERED: DocumentNode = gql`
  subscription {
    notificationTriggered {
      id
      title
      prompt
      chatId
      model
    }
  }
`;

export async function loadTasks(): Promise<Event[] | null> {
  try {
    const client = await getGraphQLClient();
    const query = gql`
      query GetTasks {
        events {
          id
          title
          prompt
          time
          isRecurring
          days
          specificDate
          enableSearch
          lastNotified
          model
        }
      }
    `;
    const { events } = await client.request<{ events: Event[] }>(query);
    return events || null;
  } catch (error) {
    console.error('Failed to load tasks:', error);
    handleGraphQLError(error);
    return null;
  }
}

export async function createTask(event: Event): Promise<Event | null> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation CreateTask($event: EventInput!) {
        createEvent(event: $event) {
          id
          title
          prompt
          time
          isRecurring
          days
          specificDate
          enableSearch
          lastNotified
          model
        }
      }
    `;
    const { createEvent } = await client.request<{ createEvent: Event }>(mutation, { event });
    return createEvent || null;
  } catch (error) {
    console.error('Failed to create task:', error);
    handleGraphQLError(error);
    throw error;
  }
}

export async function updateTask(event: Event): Promise<Event | null> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation UpdateTask($event: EventInput!) {
        updateEvent(event: $event) {
          id
          title
          prompt
          time
          isRecurring
          days
          specificDate
          enableSearch
          lastNotified
          model
        }
      }
    `;
    const { updateEvent } = await client.request<{ updateEvent: Event }>(mutation, { event });
    return updateEvent || null;
  } catch (error) {
    console.error('Failed to update task:', error);
    handleGraphQLError(error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const client = await getGraphQLClient();
    const mutation = gql`
      mutation DeleteTask($id: String!) {
        deleteEvent(id: $id)
      }
    `;
    await client.request(mutation, { id });
    return true;
  } catch (error) {
    console.error('Failed to delete task:', error);
    handleGraphQLError(error);
    throw error;
  }
}
