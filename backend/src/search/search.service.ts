// src/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import { WebUtilsService } from '../web-utils/web-utils.service'; // Корректный импорт

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  content?: string;
}

interface SearxngJsonResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    snippet?: string;
  }>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly MAX_QUERY_LENGTH = 1000;
  private readonly MAX_URL_LENGTH = 2000;
  private readonly SEARXNG_TIMEOUT_MS = 5000;
  private readonly LINK_TIMEOUT_MS = 15000;
  private readonly MAX_HTML_SIZE = 1024 * 2;

  constructor(private readonly webUtilsService: WebUtilsService) {}

  async search(
    query: string,
    searxngUrl: string,
    format: 'json' | 'html',
    limit: number = 3,
    followLinks: boolean = false,
  ): Promise<string> {
    try {
      let cleanQuery = query;
      try {
        cleanQuery = decodeURIComponent(query);
      } catch {}

      if (cleanQuery.length > this.MAX_QUERY_LENGTH) {
        throw new Error(`Запрос превышает ${this.MAX_QUERY_LENGTH} символов`);
      }
      if (!cleanQuery.trim()) {
        throw new Error('Запрос не может быть пустым');
      }
      if (searxngUrl.length > this.MAX_URL_LENGTH) {
        throw new Error(
          `URL SearXNG превышает ${this.MAX_URL_LENGTH} символов`,
        );
      }
      if (!searxngUrl.includes('%s')) {
        throw new Error('URL SearXNG должен содержать заполнитель %s');
      }
      if (
        !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(searxngUrl.replace('%s', ''))
      ) {
        throw new Error('Неверный формат URL SearXNG');
      }
      if (!['json', 'html'].includes(format)) {
        throw new Error('Неверный формат: должен быть "json" или "html"');
      }
      const validatedLimit = Math.max(1, Math.min(limit ?? 3, 100));

      let baseUrl: string;
      try {
        baseUrl = new URL(searxngUrl.replace('%s', '')).href;
      } catch {
        throw new Error('Неверный базовый URL для разрешения ссылок');
      }

      let results: SearchResultItem[] = [];

      if (format === 'json') {
        this.logger.debug(`Загрузка JSON для запроса: ${cleanQuery}`);
        const searxngController = new AbortController();
        const searxngTimeout = setTimeout(() => {
          searxngController.abort();
        }, this.SEARXNG_TIMEOUT_MS);

        try {
          const searchUrl = searxngUrl.replace(
            '%s',
            encodeURIComponent(cleanQuery),
          );
          this.logger.debug(`SearXNG URL: ${searchUrl}`);
          const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            signal: searxngController.signal,
          });

          if (!response.ok) {
            throw new Error(
              `Запрос SearXNG не удался, статус: ${response.status}`,
            );
          }

          let data: SearxngJsonResponse;
          try {
            data = (await response.json()) as SearxngJsonResponse;
          } catch {
            throw new Error('Неверный JSON-ответ от SearXNG');
          }
          if (!Array.isArray(data.results)) {
            data.results = [];
          }
          results = data.results.slice(0, validatedLimit).map((item) => ({
            title: item.title?.trim() || 'Без заголовка',
            url: item.url || 'Без URL',
            description: this.webUtilsService.cleanText(
              item.content || item.snippet || 'Без описания',
            ),
          }));
        } finally {
          clearTimeout(searxngTimeout);
        }
      } else if (format === 'html') {
        this.logger.debug(
          `Загрузка HTML через Puppeteer для запроса: ${cleanQuery}`,
        );
        const searchUrl = searxngUrl.replace(
          '%s',
          encodeURIComponent(cleanQuery),
        );
        this.logger.debug(`SearXNG URL: ${searchUrl}`);
        const html = await this.webUtilsService.parseHtmlContent(
          searchUrl,
          '',
          this.MAX_HTML_SIZE,
        );
        const $ = cheerio.load(html);
        results = $('#urls > .result')
          .slice(0, validatedLimit)
          .map((_, element) => {
            const $el = $(element);
            const title =
              $el.find('h3').text().trim() ||
              $el.find('.title').text().trim() ||
              'Без заголовка';
            const url =
              $el.find('a').attr('href') ||
              $el.find('.url').text().trim() ||
              'Без URL';
            const description = this.webUtilsService.cleanText(
              $el.find('.content').text().trim() ||
                $el.find('.description').text().trim() ||
                'Без описания',
            );
            return { title, url, description };
          })
          .get();
      }

      if (followLinks && results.length > 0) {
        this.logger.debug(`Загрузка контента ссылок через Puppeteer`);
        const limitFn = pLimit(3);
        results = await Promise.all(
          results.map((item) =>
            limitFn(async () => {
              let absoluteUrl = item.url;
              try {
                absoluteUrl = decodeURIComponent(absoluteUrl);
                this.logger.debug(
                  `Декодированный URL для followLinks: ${absoluteUrl}`,
                );
                const urlObj = new URL(absoluteUrl, baseUrl);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                  throw new Error('Неподдерживаемый протокол');
                }
                absoluteUrl = urlObj.href;
              } catch {
                return { ...item, content: 'Неверный URL' };
              }

              try {
                const content = await this.webUtilsService.parseHtmlContent(
                  absoluteUrl,
                  '',
                  this.MAX_HTML_SIZE,
                );
                return { ...item, content };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : 'Неизвестная ошибка';
                return {
                  ...item,
                  content: `Не удалось загрузить: ${errorMessage}`,
                };
              }
            }),
          ),
        );
      }

      results = results.map((item) => ({
        title: item.title || 'Без заголовка',
        url: item.url || 'Без URL',
        description: item.description || 'Без описания',
        content:
          item.content || (followLinks ? 'Контент не получен' : undefined),
      }));
      return JSON.stringify(results);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.logger.error(`Ошибка поиска: ${errorMessage}`);
      return JSON.stringify({
        error: true,
        message: `Поиск не удался: ${errorMessage}`,
        results: [],
      });
    }
  }
}
