import { type Event, getEvents, updateEvent } from '@/utils/taskScheduler';

const DEFAULT_ICON = '/logo.svg';
const NOTIFY_ICON = '/public/logo-notify.svg';
const NOTIFY_SOUND = '/public/notify.mp3';

export class NotificationService {
  private intervalId: number | null = null;
  private flashInterval: number | null = null;
  private resetTimeout: number | null = null;
  private isNotifyIcon: boolean = true;
  private checkInterval = 10000;
  private flashDuration = 120000;
  private flashSpeed = 500;

  start() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.checkTasks(), this.checkInterval);
    this.checkTasks();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopFlashing();
  }

  private async checkTasks() {
    try {
      const events = await getEvents();
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
      const currentDate = now.toISOString().split('T')[0];

      for (const event of events) {
        const [eventHour, eventMin] = event.time.split(':').map(Number);
        const timeDiffMin = (currentHour - eventHour) * 60 + (currentMin - eventMin);
        const isTimeWindow = timeDiffMin >= 0 && timeDiffMin <= 2;
        const isDayMatch = event.isRecurring
          ? event.days.includes(currentDay)
          : event.specificDate === currentDate;
        const isAlreadyNotified = event.lastNotified === currentDate;

        if (isTimeWindow && isDayMatch && !isAlreadyNotified) {
          await this.triggerNotification(event);
          await updateEvent({ ...event, lastNotified: currentDate });
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке задач:', error);
    }
  }

  private async triggerNotification(event: Event) {
    if ("Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission === "granted") {
        new Notification(event.title, {
          body: event.prompt,
          icon: NOTIFY_ICON,
        });
      }
    }

    this.stopFlashing();

    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = NOTIFY_ICON;
      this.isNotifyIcon = true;
    }

    const playSound = () => {
      const audio = new Audio(NOTIFY_SOUND);
      audio.play().catch(() => {});
    };

    if (document.visibilityState === 'visible' && document.hasFocus()) {
      playSound();
    } else {
      const handleInteraction = () => {
        playSound();
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      };
      document.addEventListener('click', handleInteraction, { once: true });
      document.addEventListener('keydown', handleInteraction, { once: true });
    }

    this.flashInterval = window.setInterval(() => {
      if (favicon) {
        favicon.href = this.isNotifyIcon ? DEFAULT_ICON : NOTIFY_ICON;
        this.isNotifyIcon = !this.isNotifyIcon;
      }
    }, this.flashSpeed);

    this.resetTimeout = window.setTimeout(() => {
      this.stopFlashing();
      if (favicon) {
        favicon.href = DEFAULT_ICON;
      }
    }, this.flashDuration);
  }

  private stopFlashing() {
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
    }
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
  }
}

export const notificationService = new NotificationService();
