import { useAlert } from '@/plugins/alertPlugin';

export const formatFileSize = (size: number | undefined): string => {
  if (!size) return '';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(2)} МБ`;
};

export const formatThinkTime = (milliseconds: number): string => {
  if (milliseconds < 1000) return `${milliseconds} мс`;
  return `${(milliseconds / 1000).toFixed(1)} сек`;
};

export const copyToClipboard = async (text: string, message = 'Скопировано!') => {
  const { showSnackbar } = useAlert();
  await navigator.clipboard.writeText(text);
  showSnackbar({ message, type: 'success' });
};
