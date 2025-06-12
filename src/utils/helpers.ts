export const handleError = (error: unknown, defaultMessage: string): string => {
  const message = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  return message;
};

export function throttle<T extends (...args: any[]) => void> (fn: T, wait: number): T {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  return function (this: any, ...args: any[]) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else {
      lastArgs = args;
      if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          timeout = null;
          if (lastArgs) {
            fn.apply(this, lastArgs);
            lastArgs = null;
          }
        }, remaining);
      }
    }
  } as T;
}

export const createThrottledFunction = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
) => throttle(async (...args: Parameters<T>) => await fn(...args), delay);

export function debounce<T extends (...args: any[]) => void> (fn: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: any[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  } as T;
}

export const extractStringFromResponse = (responseContent: string): string => {
  try {
    const parsed = JSON.parse(responseContent);
    if (typeof parsed === 'string') return parsed.trim();
    if (typeof parsed === 'object' && parsed !== null) {
      const firstValue = Object.values(parsed)[0];
      if (typeof firstValue === 'string') return firstValue.trim();
    }
  } catch {
    // Not JSON or invalid JSON
  }
  return responseContent.trim();
};

export const processStream = async (
  response: Response,
  onChunk: (data: any) => Promise<void>
) => {
  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        await onChunk(data);
      } catch (e) {
        console.error('Error parsing chunk:', e);
      }
    }
  }
};

export const findById = <T>(array: T[], id: string, key: keyof T = 'id' as keyof T): T | undefined => {
  return array.find(item => item[key] === id);
};

export function extractLink (text: string): string | null {
  const urlMatch = text.match(/(https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*/i);
  return urlMatch ? urlMatch[0] : null;
}
