import { createClient } from 'graphql-ws';
import { NOTIFICATION_TRIGGERED } from '@/api/tasks';

const DEFAULT_ICON = '/logo.svg';
const NOTIFY_ICON = '/public/logo-notify.svg';
const NOTIFY_SOUND = '/public/notify.mp3';

interface NotificationEvent {
  id: string;
  title: string;
  prompt: string;
}

export class NotificationService {
  private wsClient: ReturnType<typeof createClient> | null = null;
  private flashInterval: number | null = null;
  private resetTimeout: number | null = null;
  private isNotifyIcon: boolean = true;
  private flashDuration = 120000;
  private flashSpeed = 500;

  async start() {
    const port = (window as any).electronAPI
      ? await (window as any).electronAPI.getBackendPort()
      : 3001;
    const wsUrl = `ws://localhost:${port}/graphql`;

    console.log(`Подключение WebSocket к ${wsUrl}`);

    this.wsClient = createClient({
      url: wsUrl,
      shouldRetry: () => true,
    });

    this.wsClient.subscribe(
      { query: NOTIFICATION_TRIGGERED.loc!.source.body },
      {
        next: ({ data }) => {
          if (data?.notificationTriggered) {
            console.log('Получено уведомление:', data.notificationTriggered);
            this.triggerNotification(data.notificationTriggered as NotificationEvent);
          }
        },
        error: (error) => {
          console.error('Ошибка подписки:', error);
        },
        complete: () => {
          console.log('Подписка завершена');
        },
      },
    );
  }

  stop() {
    this.stopFlashing();
    if (this.wsClient) {
      this.wsClient.dispose();
      this.wsClient = null;
    }
  }

  private async triggerNotification(event: NotificationEvent) {
    if ('Notification' in window) {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission === 'granted') {
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
