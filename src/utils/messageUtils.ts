import { type Attachment, AttachmentType } from '@/types/chats.ts';
import type { SearchResultItem } from '../../backend/src/search/search.service.ts';
import { formatFileSize } from '@/utils/chatUtils.ts';

export function buildOllamaRequestBody (
  chat: { systemPrompt?: { content: string } | null; messages: any[] },
  selectedModel: string,
  userMessageId: string,
  finalContent: string,
  attachmentContent: Attachment | null | undefined,
  memoryContent: string | null | undefined,
  searchResults: SearchResultItem[] | null,
  linkContent: { urls: string[]; content?: string; error?: string } | null,
  textFileContent: { content: string; meta: { name: string; size: number } } | null,
) {
  const hasAttachment = !!(attachmentContent && Object.keys(attachmentContent).length);
  let images: string[] | undefined;

  const body = hasAttachment && attachmentContent!.type === AttachmentType.IMAGE
    ? { model: selectedModel, prompt: finalContent, images: [attachmentContent!.content], stream: true }
    : {
      model: selectedModel,
      messages: (() => {
        const messages: any[] = [];
        if (chat.systemPrompt) {
          messages.push({ role: 'system', content: chat.systemPrompt.content });
        }
        if (memoryContent) {
          messages.push({ role: 'system', content: memoryContent });
        }
        chat.messages.forEach(msg => {
          if (msg.id === userMessageId) {
            if (searchResults) {
              messages.push({ role: 'system', content: JSON.stringify(searchResults) });
            }
            if (linkContent) {
              messages.push({ role: 'system', content: JSON.stringify(linkContent) });
            }
            if (textFileContent && msg.attachmentMeta?.type === AttachmentType.TEXT) {
              messages.push({
                role: 'system',
                content: `[Attached: ${textFileContent.meta.name} [${formatFileSize(textFileContent.meta.size)}]]\n${textFileContent.content}`,
              });
            }
          }
          const message = {
            role: msg.role,
            content: msg.content,
          };
          messages.push(message);
        });
        return messages;
      })(),
      stream: true,
    };

  return { body, images };
}
