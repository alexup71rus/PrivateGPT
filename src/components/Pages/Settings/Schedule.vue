<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useAlert } from '@/plugins/alertPlugin';
import { addEvent, deleteEvent, type Event, getEvents, updateEvent } from '@/utils/taskScheduler.ts';

const { showSnackbar } = useAlert();

const newTask = ref<Event>({
  id: '',
  title: '',
  prompt: '',
  time: '',
  isRecurring: false,
  days: [],
  specificDate: '',
  enableSearch: false,
  lastNotified: '',
});

const maxEvents = 30;
const events = ref<Event[]>([]);
const isAdding = ref(false);
const isEditing = ref(false);
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const isFormValid = computed(() =>
  newTask.value.title &&
  newTask.value.prompt &&
  newTask.value.time &&
  (newTask.value.isRecurring ? newTask.value.days.length > 0 : !!newTask.value.specificDate)
);

const eventCountValid = computed(() => !isEditing.value && events.value.length >= maxEvents);

const loadEvents = async () => {
  events.value = await getEvents();
};

const addTask = async () => {
  if (!isFormValid.value) {
    showSnackbar({ message: 'Fill all fields', type: 'error' });
    return;
  }
  if (eventCountValid.value) {
    showSnackbar({ message: `Maximum number of tasks reached (${maxEvents})`, type: 'error' });
    return;
  }
  try {
    isAdding.value = true;
    const task: Event = {
      id: crypto.randomUUID(),
      title: newTask.value.title,
      prompt: newTask.value.prompt,
      time: newTask.value.time,
      isRecurring: newTask.value.isRecurring,
      days: newTask.value.isRecurring ? [...newTask.value.days] : [],
      specificDate: newTask.value.isRecurring ? '' : newTask.value.specificDate,
      enableSearch: newTask.value.enableSearch,
      lastNotified: '',
    };
    await addEvent(task);
    await loadEvents();
    resetForm();
    showSnackbar({ message: 'Task added', type: 'success' });
  } catch (error) {
    showSnackbar({ message: 'Error adding task', type: 'error' });
    console.error(error);
  } finally {
    isAdding.value = false;
  }
};

const updateTask = async () => {
  if (!isFormValid.value) {
    showSnackbar({ message: 'Fill all fields', type: 'error' });
    return;
  }
  try {
    isAdding.value = true;
    const oldEvent = events.value.find(e => e.id === newTask.value.id);
    let lastNotified = newTask.value.lastNotified || '';
    if (oldEvent) {
      const timeChanged = oldEvent.time !== newTask.value.time;
      const dateChanged = !newTask.value.isRecurring && oldEvent.specificDate !== newTask.value.specificDate;
      const recurringChanged = oldEvent.isRecurring !== newTask.value.isRecurring;
      const daysChanged = newTask.value.isRecurring && (oldEvent.days.sort().join() !== newTask.value.days.sort().join());
      if (timeChanged || dateChanged || recurringChanged || daysChanged) {
        lastNotified = '';
      }
    }
    const task: Event = {
      id: newTask.value.id,
      title: newTask.value.title,
      prompt: newTask.value.prompt,
      time: newTask.value.time,
      isRecurring: newTask.value.isRecurring,
      days: newTask.value.isRecurring ? [...newTask.value.days] : [],
      specificDate: newTask.value.isRecurring ? '' : newTask.value.specificDate,
      enableSearch: newTask.value.enableSearch,
      lastNotified,
    };
    await updateEvent(task);
    await loadEvents();
    resetForm();
    showSnackbar({ message: 'Task updated', type: 'success' });
  } catch (error) {
    showSnackbar({ message: 'Error updating task', type: 'error' });
    console.error(error);
  } finally {
    isAdding.value = false;
  }
};

const editTask = (event: Event) => {
  newTask.value = { ...event, days: [...event.days] };
  isEditing.value = true;
};

const resetForm = () => {
  newTask.value = { id: '', title: '', prompt: '', time: '', isRecurring: false, days: [], specificDate: '', enableSearch: false, lastNotified: '' };
  isEditing.value = false;
};

const deleteTask = async (id: string) => {
  try {
    await deleteEvent(id);
    await loadEvents();
    showSnackbar({ message: 'Task deleted', type: 'success' });
  } catch (error) {
    showSnackbar({ message: 'Error deleting task', type: 'error' });
  }
};

loadEvents();
</script>

<template>
  <div>
    <v-card-title class="text-h6 pb-2">Task Manager</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="isEditing ? updateTask() : addTask()">
        <v-text-field
          v-model="newTask.title"
          class="mb-4"
          label="Title"
          :rules="[v => !!v || 'Required field']"
          variant="solo-filled"
        />

        <v-textarea
          v-model="newTask.prompt"
          class="mb-4"
          label="Prompt (e.g., 'Weather in London')"
          rows="4"
          :rules="[v => !!v || 'Required field']"
          variant="solo-filled"
        />

        <v-text-field
          v-model="newTask.time"
          class="mb-4"
          label="Time (24h format, e.g., 10:00)"
          type="time"
          :rules="[v => !!v || 'Required field']"
          variant="solo-filled"
        />

        <v-switch
          v-model="newTask.enableSearch"
          label="Enable search"
          class="mb-4"
          color="blue"
        />

        <v-row>
          <v-col cols="12" sm="5">
            <v-switch
              v-model="newTask.isRecurring"
              label="Recurring event"
              color="blue"
            />
          </v-col>
          <v-col cols="12" sm="7">
            <v-select
              v-if="newTask.isRecurring"
              v-model="newTask.days"
              :items="daysOfWeek"
              label="Days of week"
              multiple
              :rules="[v => v.length > 0 || 'Select at least one day']"
              variant="solo-filled"
            />
            <v-text-field
              v-else
              v-model="newTask.specificDate"
              type="date"
              label="Specific date"
              :rules="[v => !!v || 'Required field']"
              variant="solo-filled"
            />
          </v-col>
        </v-row>

        <v-btn
          block
          color="blue"
          :disabled="!isFormValid || isAdding || eventCountValid"
          type="submit"
          variant="flat"
          class="mt-4"
        >
          {{ isEditing ? 'Update Task' : 'Add Task' }}
        </v-btn>
      </v-form>

      <v-divider class="my-6" />
      <h3 class="section-subtitle">Scheduled Tasks</h3>

      <v-list v-if="events.length" class="prompt-list">
        <v-list-item v-for="event in events" :key="event.id" class="prompt-item">
          <div class="prompt-content">
            <div class="content-title">{{ event.title }}</div>
            <div class="content-details">{{ event.prompt }}</div>
            <div class="content-details">Time: {{ event.time }}</div>
            <div class="content-details" v-if="event.isRecurring">
              Days: {{ event.days.join(', ') }}
            </div>
            <div class="content-details" v-else>Date: {{ event.specificDate }}</div>
            <div class="content-details">Search: {{ event.enableSearch ? 'Enabled' : 'Disabled' }}</div>
          </div>
          <template #append>
            <v-btn
              color="blue"
              icon="mdi-pencil"
              variant="text"
              @click="editTask(event)"
            />
            <v-btn
              color="red"
              icon="mdi-delete"
              variant="text"
              @click="deleteTask(event.id)"
            />
          </template>
        </v-list-item>
      </v-list>
      <div v-else class="no-data">No scheduled tasks</div>
    </v-card-text>
  </div>
</template>

<style lang="scss" scoped>
.v-card-text {
  padding: 16px;
}

.section-subtitle {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 16px;
}

.prompt-list {
  max-height: calc(100vh - 848px);
  min-height: 300px;
  background: transparent;
}

::v-global(.electron .prompt-list) {
  min-height: 300px;
  max-height: calc(100vh - 878px);
}

.prompt-item {
  border-bottom: 1px solid rgb(var(--v-theme-on-primary));
  padding: 12px 0;
  display: flex;
  align-items: center;
}

.prompt-content {
  flex: 1;
  padding-right: 16px;
}

.content-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.content-details {
  font-size: 0.9rem;
  color: #666;
}

.no-data {
  text-align: center;
  color: #666;
  padding: 16px;
}

::v-deep(.v-list-item) {
  padding-inline: 0 !important;
}

::v-deep(.v-list-item__append) {
  margin-left: auto;
}
</style>
