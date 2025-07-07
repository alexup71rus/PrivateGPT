import { Injectable, Logger } from '@nestjs/common';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import { WebUtilsService } from '../web-utils/web-utils.service';
import {
  MAX_HTML_SIZE,
  MAX_QUERY_LENGTH,
  MAX_URL_LENGTH,
  SEARXNG_TIMEOUT_MS,
} from '../common/constants';

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

      if (cleanQuery.length > MAX_QUERY_LENGTH) {
        throw new Error(`Query exceeds ${MAX_QUERY_LENGTH} characters`);
      }
      if (!cleanQuery.trim()) {
        throw new Error('Query cannot be empty');
      }
      if (searxngUrl.length > MAX_URL_LENGTH) {
        throw new Error(`SearXNG URL exceeds ${MAX_URL_LENGTH} characters`);
      }
      if (!searxngUrl.includes('%s')) {
        throw new Error('SearXNG URL must contain %s placeholder');
      }
      if (
        !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(searxngUrl.replace('%s', ''))
      ) {
        throw new Error('Invalid SearXNG URL format');
      }
      if (!['json', 'html'].includes(format)) {
        throw new Error('Invalid format: must be "json" or "html"');
      }
      const validatedLimit = Math.max(1, Math.min(limit ?? 3, 100));

      let baseUrl: string;
      try {
        baseUrl = new URL(searxngUrl.replace('%s', '')).href;
      } catch {
        throw new Error('Invalid base URL for link resolution');
      }

      let results: SearchResultItem[] = [];
      const searchUrl = searxngUrl.replace(
        '%s',
        encodeURIComponent(cleanQuery),
      );

      if (format === 'json') {
        const searxngController = new AbortController();
        const searxngTimeout = setTimeout(() => {
          searxngController.abort();
        }, SEARXNG_TIMEOUT_MS);

        try {
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
              `SearXNG request failed, status: ${response.status}`,
            );
          }

          let data: SearxngJsonResponse;
          try {
            data = (await response.json()) as SearxngJsonResponse;
          } catch {
            throw new Error('Invalid JSON response from SearXNG');
          }
          if (!Array.isArray(data.results)) {
            data.results = [];
          }
          results = data.results.slice(0, validatedLimit).map((item) => ({
            title: item.title?.trim() || 'No title',
            url: item.url || 'No URL',
            description: this.webUtilsService.cleanText(
              item.content || item.snippet || 'No description',
            ),
          }));
        } finally {
          clearTimeout(searxngTimeout);
        }
      } else if (format === 'html') {
        const html = await this.webUtilsService.parseHtmlContent(
          searchUrl,
          MAX_HTML_SIZE,
        );
        const $ = cheerio.load(html);
        results = $('#urls > .result')
          .slice(0, validatedLimit)
          .map((_, element) => {
            const $el = $(element);
            const title =
              $el.find('h3').text().trim() ||
              $el.find('.title').text().trim() ||
              'No title';
            const url =
              $el.find('a').attr('href') ||
              $el.find('.url').text().trim() ||
              'No URL';
            const description = this.webUtilsService.cleanText(
              $el.find('.content').text().trim() ||
                $el.find('.description').text().trim() ||
                'No description',
            );
            return { title, url, description };
          })
          .get();
      }

      if (followLinks && results.length > 0) {
        const batchSize = 3;
        const processedResults: SearchResultItem[] = [];
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              let absoluteUrl = item.url;
              try {
                absoluteUrl = decodeURIComponent(absoluteUrl);
                const urlObj = new URL(absoluteUrl, baseUrl);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                  throw new Error('Unsupported protocol');
                }
                absoluteUrl = urlObj.href;
              } catch {
                return { ...item, content: 'Invalid URL' };
              }

              try {
                const content = await this.webUtilsService.parseHtmlContent(
                  absoluteUrl,
                  MAX_HTML_SIZE,
                );
                return { ...item, content };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : 'Unknown error';
                return {
                  ...item,
                  content: `Failed to load: ${errorMessage}`,
                };
              }
            }),
          );
          processedResults.push(...batchResults);
        }
        results = processedResults;
      }

      // Format results with default values
      results = results.map((item) => ({
        title: item.title || 'No title',
        url: item.url || 'No URL',
        description: item.description || 'No description',
        content:
          item.content || (followLinks ? 'Content not retrieved' : undefined),
      }));
      return JSON.stringify(results);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Search error: ${errorMessage}`);
      return JSON.stringify({
        error: true,
        message: `Search failed: ${errorMessage}`,
        results: [],
      });
    }
  }
}
