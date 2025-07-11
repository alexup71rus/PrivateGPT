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
