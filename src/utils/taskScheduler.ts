import { openDB } from 'idb';

export interface Event {
  id: string;
  title: string;
  prompt: string;
  time: string;
  isRecurring: boolean;
  days: string[];
  specificDate: string;
  enableSearch: boolean;
  lastNotified?: string;
}

const dbPromise = openDB('eventsDB', 1, {
  upgrade(db) {
    db.createObjectStore('events', { keyPath: 'id' });
  },
});

export async function addEvent(event: Event) {
  const db = await dbPromise;
  await db.put('events', event);
}

export async function updateEvent(event: Event) {
  const db = await dbPromise;
  await db.put('events', event);
}

export async function getEvents(): Promise<Event[]> {
  const db = await dbPromise;
  return await db.getAll('events');
}

export async function deleteEvent(id: string) {
  const db = await dbPromise;
  await db.delete('events', id);
}
