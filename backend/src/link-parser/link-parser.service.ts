// src/link-parser/link-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { WebUtilsService } from '../web-utils/web-utils.service'; // Корректный импорт
import { LinkContent } from './link-parser.resolver';

@Injectable()
export class LinkParserService {
  private readonly logger = new Logger(LinkParserService.name);
  private readonly LINK_TIMEOUT_MS = 15000;
  private readonly MAX_HTML_SIZE = 1024 * 2;
  private readonly MAX_URL_LENGTH = 2000;

  constructor(private readonly webUtilsService: WebUtilsService) {}

  async fetchLinkContent(urls: string[]): Promise<LinkContent> {
    try {
      if (!urls || !urls.length) {
        throw new Error('Нет URL-адресов');
      }

      this.logger.debug(`Исходные URLs: ${JSON.stringify(urls)}`);

      const validUrls = urls.filter((url) => {
        if (!url || url === 'undefined' || !url.trim()) return false;
        let decodedUrl: string;
        try {
          decodedUrl = decodeURIComponent(url.trim());
          this.logger.debug(`Декодированный URL: ${decodedUrl}`);
        } catch {
          this.logger.warn(`Не удалось декодировать URL: ${url}`);
          return false;
        }
        if (decodedUrl.length > this.MAX_URL_LENGTH) return false;
        try {
          new URL(decodedUrl);
          return /^https?:\/\/[^\s/$.?#]+.[^\s]*$/.test(decodedUrl);
        } catch {
          return false;
        }
      });

      if (!validUrls.length) {
        throw new Error('Нет валидных URL-адресов');
      }

      const limitFn = pLimit(3);
      const results = await Promise.all(
        validUrls.map((url) =>
          limitFn(async () => {
            try {
              const content = await this.webUtilsService.parseHtmlContent(
                url,
                '',
                this.MAX_HTML_SIZE,
              );
              return { url, content };
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Неизвестная ошибка';
              return { url, content: `Не удалось загрузить: ${errorMessage}` };
            }
          }),
        ),
      );

      const combinedContent = results
        .map((result) => `Контент с ${result.url}:\n${result.content}`)
        .join('\n\n');

      return { content: combinedContent };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return {
        content: '',
        error: `Не удалось загрузить контент: ${errorMessage}`,
      };
    }
  }
}
