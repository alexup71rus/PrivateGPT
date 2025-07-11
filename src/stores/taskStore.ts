import { defineStore } from 'pinia';
import { type Event } from '@/types/tasks';
import { createTask, deleteTask, loadTasks, updateTask } from '@/api/tasks.ts';

export interface TaskState {
  events: Event[];
  loading: boolean;
  error: string | null;
}

export const useTaskStore = defineStore('tasks', {
  state: (): TaskState => ({
    events: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchTasks() {
      this.loading = true;
      this.error = null;
      try {
        const tasks = await loadTasks();
        this.events = tasks || [];
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks';
      } finally {
        this.loading = false;
      }
    },
    async addTask(event: Event) {
      this.loading = true;
      this.error = null;
      try {
        const newTask = await createTask(event);
        if (newTask) {
          this.events.push(newTask);
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to add task';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateTask(event: Event) {
      this.loading = true;
      this.error = null;
      try {
        const updatedEvent = await updateTask(event);
        if (updatedEvent) {
          this.events = this.events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update task';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteTask(id: string) {
      this.loading = true;
      this.error = null;
      try {
        await deleteTask(id);
        this.events = this.events.filter(e => e.id !== id);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task';
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
