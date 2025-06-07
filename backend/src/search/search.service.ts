import fetch, { RequestInit, Response } from 'node-fetch';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { URL } from 'url';

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

export class SearchService {
  private readonly MAX_QUERY_LENGTH = 1000;
  private readonly MAX_URL_LENGTH = 2000;
  private readonly SEARXNG_TIMEOUT_MS = 5000;
  private readonly LINK_TIMEOUT_MS = 15000;
  private readonly MAX_HTML_SIZE = 1024 * 1024; // 1MB
  private readonly MAX_RETRIES = 2;

  constructor() {
    // Диагностика Cheerio
    console.log('Cheerio load:', typeof cheerio.load);
  }

  async search(
    query: string,
    searxngUrl: string,
    format: 'json' | 'html',
    limit: number = 3,
    followLinks: boolean = false,
  ): Promise<string> {
    let cleanQuery = query;
    try {
      // Decode query
      try {
        cleanQuery = decodeURIComponent(query);
      } catch (e) {
        console.warn(`Query "${query}" is not URL-encoded; using as-is.`);
      }

      // Validate inputs
      if (cleanQuery.length > this.MAX_QUERY_LENGTH) {
        throw new Error(`Query exceeds ${this.MAX_QUERY_LENGTH} characters`);
      }
      if (!cleanQuery.trim()) {
        throw new Error('Query cannot be empty');
      }
      if (searxngUrl.length > this.MAX_URL_LENGTH) {
        throw new Error(
          `SearXNG URL exceeds ${this.MAX_URL_LENGTH} characters`,
        );
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

      // Validate base URL
      let baseUrl: string;
      try {
        baseUrl = new URL(searxngUrl.replace('%s', '')).href;
      } catch (e) {
        throw new Error('Invalid base URL for link resolution');
      }

      // Set up AbortController
      const searxngController = new AbortController();
      const searxngTimeout = setTimeout(() => {
        searxngController.abort();
      }, this.SEARXNG_TIMEOUT_MS);

      try {
        const response = await this.fetchWithRetry(
          searxngUrl.replace('%s', encodeURIComponent(cleanQuery)),
          {
            method: 'GET',
            headers: {
              'Content-Type':
                format === 'json' ? 'application/json' : 'text/html',
              Accept: format === 'json' ? 'application/json' : 'text/html',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            signal: searxngController.signal,
          },
          cleanQuery,
        );

        if (!response.ok) {
          throw new Error(
            `SearXNG request failed with status ${response.status}`,
          );
        }

        let results: SearchResultItem[] = [];

        if (format === 'json') {
          let data: SearxngJsonResponse;
          try {
            data = (await response.json()) as SearxngJsonResponse;
          } catch (e) {
            throw new Error('Invalid JSON response from SearXNG');
          }
          if (!Array.isArray(data.results)) {
            console.warn(
              `Invalid JSON results format for query "${cleanQuery}"`,
            );
            data.results = [];
          }
          results = data.results.slice(0, validatedLimit).map((item) => ({
            title: this.sanitizeText(item.title?.trim()) || 'No title',
            url: this.sanitizeText(item.url) || 'No URL',
            description: this.cleanText(
              item.content || item.snippet || 'No description',
            ),
          }));
          if (!data.results.length) {
            console.warn(`No JSON results found for query "${cleanQuery}"`);
          }
        } else if (format === 'html') {
          const html: string = await response.text();
          if (html.length > this.MAX_HTML_SIZE) {
            throw new Error('HTML response exceeds maximum size');
          }
          let $: cheerio.CheerioAPI;
          try {
            $ = cheerio.load(html);
          } catch (e) {
            console.error(`Failed to load Cheerio for HTML parsing: ${e}`);
            throw new Error('Failed to parse HTML response');
          }
          results = $('#urls > .result')
            .slice(0, validatedLimit)
            .map((_, element) => {
              const $el = $(element);
              const title =
                this.sanitizeText($el.find('h3').text().trim()) ||
                this.sanitizeText($el.find('.title').text().trim()) ||
                'No title';
              const url =
                this.sanitizeText($el.find('a').attr('href')) ||
                this.sanitizeText($el.find('.url').text().trim()) ||
                'No URL';
              const description = this.cleanText(
                $el.find('.content').text().trim() ||
                  $el.find('.description').text().trim() ||
                  'No description',
              );
              return { title, url, description };
            })
            .get();
          if (!results.length) {
            console.warn(`No HTML results found for query "${cleanQuery}"`);
          }
        }

        console.log(`Initial results for query "${cleanQuery}":`, results);

        if (followLinks && results.length > 0) {
          const limitFn = pLimit(3);
          results = await Promise.all(
            results.map((item) =>
              limitFn(async () => {
                let absoluteUrl = item.url;
                try {
                  const urlObj = new URL(item.url, baseUrl);
                  if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    throw new Error('Unsupported protocol');
                  }
                  absoluteUrl = urlObj.href;
                } catch (urlError) {
                  console.warn(
                    `Invalid URL ${item.url} for query "${cleanQuery}":`,
                    urlError,
                  );
                  return { ...item, content: 'Invalid URL' };
                }

                try {
                  const linkController = new AbortController();
                  const linkTimeout = setTimeout(() => {
                    linkController.abort();
                  }, this.LINK_TIMEOUT_MS);

                  try {
                    console.log(
                      `Fetching link ${absoluteUrl} for query "${cleanQuery}"`,
                    );
                    const linkResponse = await this.fetchWithRetry(
                      absoluteUrl,
                      {
                        method: 'GET',
                        headers: {
                          Accept: 'text/html',
                          'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        },
                        signal: linkController.signal,
                      },
                      cleanQuery,
                    );

                    if (!linkResponse.ok) {
                      throw new Error(
                        `Failed to fetch ${absoluteUrl}: ${linkResponse.status}`,
                      );
                    }

                    const linkHtml: string = await linkResponse.text();
                    if (linkHtml.length > this.MAX_HTML_SIZE) {
                      throw new Error('Link HTML exceeds maximum size');
                    }
                    let $: cheerio.CheerioAPI;
                    try {
                      $ = cheerio.load(linkHtml);
                    } catch (e) {
                      console.error(
                        `Failed to load Cheerio for link ${absoluteUrl}: ${e}`,
                      );
                      return { ...item, content: 'Content parsing failed' };
                    }
                    $('script, style, nav, footer, header').remove();
                    const content =
                      this.cleanText(this.extractText($, $('body')[0])) ||
                      'No content available';
                    console.log(
                      `Successfully fetched content for ${absoluteUrl}`,
                    );
                    return { ...item, content };
                  } finally {
                    clearTimeout(linkTimeout);
                  }
                } catch (error: unknown) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : typeof error === 'string'
                        ? error
                        : 'Unknown error';
                  console.warn(
                    `Failed to follow link ${absoluteUrl} for query "${cleanQuery}": ${
                      error instanceof Error && error.name === 'AbortError'
                        ? `Request timed out after ${this.LINK_TIMEOUT_MS}ms`
                        : errorMessage
                    }`,
                    error,
                  );
                  return {
                    ...item,
                    content: `Failed to fetch: ${errorMessage}`,
                  };
                }
              }),
            ),
          );
        }

        console.log(`Final results for query "${cleanQuery}":`, results);
        results = results.map((item) => ({
          title: item.title || 'No title',
          url: item.url || 'No URL',
          description: item.description || 'No description',
          content:
            item.content || (followLinks ? 'Content not retrieved' : undefined),
        }));
        return JSON.stringify(results);
      } finally {
        clearTimeout(searxngTimeout);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      console.error(
        `SearchService error for query "${cleanQuery}" and URL "${searxngUrl}": ${
          error instanceof Error && error.name === 'AbortError'
            ? `Request timed out after ${this.SEARXNG_TIMEOUT_MS}ms`
            : errorMessage
        }`,
        error,
      );
      return JSON.stringify({
        error: true,
        message: `Search failed: ${
          error instanceof Error && error.name === 'AbortError'
            ? `Request timed out after ${this.SEARXNG_TIMEOUT_MS}ms`
            : errorMessage
        }`,
        results: [],
      });
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    query: string,
    retries: number = this.MAX_RETRIES,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok && [502, 503, 504].includes(response.status)) {
          if (attempt === retries) {
            throw new Error(
              `Failed after ${retries} attempts with status ${response.status}`,
            );
          }
          console.warn(
            `Retry ${attempt}/${retries} for ${url} (status ${response.status}, query "${query}")`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        return response;
      } catch (error: unknown) {
        if (
          attempt === retries ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          throw error;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';
        console.warn(
          `Retry ${attempt}/${retries} for ${url} (query "${query}"): ${errorMessage}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Unexpected fetch failure');
  }

  private extractText($: cheerio.CheerioAPI, element: any): string {
    let text = '';
    const blockElements = [
      'div',
      'p',
      'tr',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ];

    // Рекурсивно обходим DOM
    $(element)
      .contents()
      .each((_, node) => {
        if (node.type === 'text') {
          text += (node.data || '').trim();
        } else if (node.type === 'tag') {
          const childText = this.extractText($, node);
          if (childText) {
            // Добавляем \n для блочных элементов, пробел для инлайн
            text += blockElements.includes(node.name)
              ? '\n' + childText + '\n'
              : ' ' + childText;
          }
        }
      });

    return text.trim();
  }

  private cleanText(text: string): string {
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n+/g, '\n')
      .replace(/,([^\s])/g, ', $1')
      .replace(/(\d)([^\d\s])/g, '$1 $2')
      .trim() // Убираем пробелы и \n в начале/конце
      .slice(0, 500); // Обрезаем до 500 символов
  }

  private sanitizeText(text: string | undefined): string {
    return text
      ? text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500)
      : '';
  }
}
