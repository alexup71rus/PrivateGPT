import { createClient } from 'graphql-ws';
import { NOTIFICATION_TRIGGERED } from '@/api/tasks';
import { useChatStore } from '@/stores/chat';
import { loadChatById } from '@/api/chats';

const DEFAULT_ICON = '/logo.svg';
const NOTIFY_ICON = '/logo-notify.svg';
const NOTIFY_SOUND = '/notify.mp3';

interface NotificationEvent {
  id: string;
  title: string;
  prompt: string;
  chatId: string;
}

export class NotificationService {
  private wsClient: ReturnType<typeof createClient> | null = null;
  private flashInterval: number | null = null;
  private resetTimeout: number | null = null;
  private isNotifyIcon: boolean = true;
  private flashDuration = 120000;
  private flashSpeed = 500;
  private baseUrl = 'http://localhost:3002';

  async start() {
    const port = (window as any).electronAPI
      ? await (window as any).electronAPI.getBackendPort()
      : 3001;
    const wsUrl = `ws://localhost:${port}/graphql`;

    this.wsClient = createClient({
      url: wsUrl,
      shouldRetry: () => true,
    });

    this.wsClient.subscribe(
      { query: NOTIFICATION_TRIGGERED.loc!.source.body },
      {
        next: ({ data }) => {
          if (data?.notificationTriggered) {
            this.triggerNotification(data.notificationTriggered as NotificationEvent);
          } else {
            console.error('No notificationTriggered data received');
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
        },
        complete() {},
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
    const chatStore = useChatStore();
    if (event.chatId) {
      const newChat = await loadChatById(event.chatId);
      if (newChat) {
        chatStore.fetchChatById(newChat);
        await chatStore.fetchChatMessages(event.chatId);
      } else {
        console.error('Failed to load chat with ID:', event.chatId);
      }
    } else {
      console.error('No chatId in notification event:', event);
    }

    if ('Notification' in window) {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission === 'granted') {
        const notification = new Notification(event.title, {
          body: `${event.prompt}\nOpen chat: ${this.baseUrl}/#${event.chatId}`,
          icon: NOTIFY_ICON,
        });
        notification.onclick = () => {
          window.location.href = `${this.baseUrl}/#${event.chatId}`;
          window.focus();
        };
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
      audio.play().catch((error) => console.error('Failed to play notification sound:', error));
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
