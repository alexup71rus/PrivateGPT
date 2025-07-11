console.log('Service Worker: Инициализация', new Date().toISOString());

const dbRequest = indexedDB.open('eventsDB', 1);

dbRequest.onupgradeneeded = (event) => {
  console.log('Service Worker: Создание objectStore');
  const db = event.target.result;
  db.createObjectStore('events', { keyPath: 'id' });
};

async function checkEvents() {
  console.log('Service Worker: Проверка задач', new Date().toISOString());
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('eventsDB', 1);
      request.onsuccess = () => {
        console.log('Service Worker: База открыта');
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Service Worker: Ошибка открытия базы:', request.error);
        reject(request.error);
      };
    });

    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const events = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        console.log('Service Worker: Задачи получены:', request.result);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Service Worker: Ошибка получения задач:', request.error);
        reject(request.error);
      };
    });

    console.log('Service Worker: Количество задач:', events.length);

    if (events.length === 0) {
      console.log('Service Worker: Нет задач для обработки');
      return;
    }

    const deleteDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('eventsDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const event of events) {
      console.log('Service Worker: Обработка задачи:', event);
      setTimeout(async () => {
        try {
          self.registration.showNotification(event.title || 'Без заголовка', {
            body: event.prompt || 'Запланированное событие!',
          });
          console.log('Service Worker: Уведомление отправлено для ID:', event.id);
        } catch (notifyError) {
          console.error('Service Worker: Ошибка уведомления:', notifyError);
        }

        try {
          const deleteTransaction = deleteDb.transaction(['events'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('events');
          await new Promise((resolve, reject) => {
            const deleteRequest = deleteStore.delete(event.id);
            deleteRequest.onsuccess = () => {
              console.log('Service Worker: Задача удалена, ID:', event.id);
              resolve();
            };
            deleteRequest.onerror = () => {
              console.error('Service Worker: Ошибка удаления задачи:', deleteRequest.error);
              reject(deleteRequest.error);
            };
          });
        } catch (deleteError) {
          console.error('Service Worker: Ошибка при удалении задачи:', deleteError);
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Service Worker: Ошибка проверки задач:', error);
  }
}

self.addEventListener('activate', () => {
  console.log('Service Worker: Активирован', new Date().toISOString());
  checkEvents();
  setInterval(checkEvents, 5000); // Проверка каждые 5 секунд
});
