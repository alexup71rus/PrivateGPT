// src/web-utils/web-utils.service.ts
import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { EXCLUDED_CLASSES, EXCLUDED_TAGS } from './web-utils.constants';

@Injectable()
export class WebUtilsService {
  private readonly logger = new Logger(WebUtilsService.name);

  private async getRenderedHtml(
    url: string,
    retries: number = 2,
  ): Promise<string> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    ];

    for (let attempt = 1; attempt <= retries; attempt++) {
      let browser: Browser | undefined;
      let page: Page | undefined;
      try {
        this.logger.debug(`Попытка ${attempt} рендеринга ${url}`);
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
        page = await browser.newPage();

        const userAgent =
          userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(userAgent);
        this.logger.debug(`Используется User-Agent: ${userAgent}`);

        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            this.logger.warn(`Ошибка JS на странице ${url}: ${msg.text()}`);
          }
        });

        this.logger.debug(`Загрузка страницы ${url}`);
        const response = await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 90000,
        });
        if (!response?.ok()) {
          this.logger.warn(
            `HTTP-статус загрузки ${url}: ${response?.status()}`,
          );
        }

        await page
          .waitForSelector(
            'body > div, article, main, section, p, h1, h2, h3',
            {
              timeout: 10000,
            },
          )
          .catch(() => {
            this.logger.warn(
              `Ключевые селекторы не найдены для ${url} на попытке ${attempt}`,
            );
          });

        this.logger.debug(`Прокрутка страницы ${url}`);
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const html = await page.content();
        this.logger.debug(
          `Длина отрендеренного HTML для ${url}: ${html.length}`,
        );
        if (html.length < 100) {
          this.logger.warn(`HTML слишком короткий: ${html.slice(0, 100)}`);
        }
        return html;
      } catch (error) {
        this.logger.error(
          `Ошибка Puppeteer на попытке ${attempt} для ${url}: ${error.message}`,
        );
        if (attempt === retries) {
          throw new Error(
            `Не удалось отрендерить ${url} после ${retries} попыток: ${error.message}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } finally {
        if (page) await page.close();
        if (browser) {
          await browser.close();
          this.logger.debug(`Браузер закрыт для ${url}`);
        }
      }
    }
    throw new Error('Неожиданная ошибка рендеринга');
  }

  private extractText($: cheerio.CheerioAPI, element: any): string {
    const blockElements = [
      'section',
      'article',
      'main',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'a',
    ];
    let text = '';

    $(element)
      .contents()
      .each((_, node) => {
        if (node.type === 'text') {
          const nodeText = (node.data || '').trim();
          if (nodeText) {
            text += nodeText + ' ';
          }
        } else if (node.type === 'tag') {
          const childText = this.extractText($, node);
          const dataValue = $(node).attr('data-value') || '';
          const dataTooltip = $(node).attr('data-tooltip') || '';
          const combinedText = [childText, dataValue, dataTooltip]
            .filter(Boolean)
            .join(' ');

          if (combinedText) {
            if (blockElements.includes(node.name)) {
              text += `\n${combinedText}\n`;
            } else {
              text += combinedText + ' ';
            }
          }
        }
      });

    return text.trim();
  }

  public cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n')
      .replace(/,([^\s])/g, ', $1')
      .replace(/(\d)([^\d\s])/g, '$1 $2')
      .trim();
  }

  async parseHtmlContent(
    url: string,
    _html: string,
    maxSize: number,
  ): Promise<string> {
    try {
      // Декодируем URL
      let decodedUrl = url;
      try {
        decodedUrl = decodeURIComponent(url);
        this.logger.debug(`Декодированный URL: ${decodedUrl}`);
      } catch (e) {
        this.logger.warn(`Не удалось декодировать URL: ${url}`);
      }

      this.logger.debug(`Начало парсинга ${decodedUrl} с maxSize=${maxSize}`);

      const html = await this.getRenderedHtml(decodedUrl);
      this.logger.debug(`Длина полученного HTML: ${html.length}`);

      const $ = cheerio.load(html, { xmlMode: false });

      const bodyContent = $('body').html()?.slice(0, 200) || '';
      this.logger.debug(`Начало <body>: ${bodyContent}`);

      const excludeSelector = [
        ...EXCLUDED_TAGS,
        ...EXCLUDED_CLASSES.map((cls) => `.${cls}`),
        '[style*="display: none"]',
        '[hidden]',
      ].join(',');
      $(excludeSelector).remove();
      this.logger.debug(`Удалены элементы по селектору: ${excludeSelector}`);

      const metaDescription = this.cleanText(
        $('meta[name="description"]').attr('content') || '',
      );
      const ogDescription = this.cleanText(
        $('meta[property="og:description"]').attr('content') || '',
      );
      this.logger.debug(`Мета-описание: ${metaDescription.slice(0, 100)}`);
      this.logger.debug(`OG-описание: ${ogDescription.slice(0, 100)}`);

      const contentBlocks: string[] = [];
      const processedTexts = new Set<string>();

      const containers = $('body')
        .find('section, article, main, h1, h2, h3, ul, ol, a, p, div')
        .filter((_, el) => {
          const text = this.extractText($, el);
          const isValid = text.length > 5;
          if (!isValid) {
            this.logger.debug(
              `Игнорируется элемент с коротким текстом: ${text.slice(0, 50)}`,
            );
          }
          return isValid;
        });

      this.logger.debug(
        `Найдено ${containers.length} контейнеров для ${decodedUrl}`,
      );
      containers.each((_, element) => {
        const text = this.cleanText(this.extractText($, element));
        if (text && !processedTexts.has(text)) {
          processedTexts.add(text);
          contentBlocks.push(text);
          this.logger.debug(`Добавлен блок: ${text.slice(0, 100)}`);
        }
      });

      let content = contentBlocks.join('\n---\n').trim();
      if (!content) {
        this.logger.warn(
          `Контент не найден, использование мета-данных или текста body`,
        );
        content =
          metaDescription ||
          ogDescription ||
          this.cleanText(this.extractText($, $('body'))) ||
          '';
        this.logger.debug(`Запасной контент: ${content.slice(0, 100)}`);
      }

      if (!content) {
        this.logger.warn(`Контент пуст, использование сырого текста body`);
        content = this.cleanText($('body').text()) || 'Контент недоступен';
        this.logger.debug(`Сырой текст body: ${content.slice(0, 100)}`);
      }

      if (content.length > maxSize) {
        this.logger.debug(`Контент превышает maxSize (${maxSize}), обрезка`);
        content = content.slice(0, maxSize);
        const lastSpace = content.lastIndexOf(' ');
        if (lastSpace > maxSize * 0.8) {
          content = content.slice(0, lastSpace) + '...';
        }
      }

      this.logger.debug(`Длина финального контента: ${content.length}`);
      if (content === 'Контент недоступен') {
        this.logger.error(`Итоговый контент недоступен для ${decodedUrl}`);
      }
      return content;
    } catch (error) {
      this.logger.error(`Ошибка парсинга ${url}: ${error.message}`);
      return 'Контент недоступен';
    }
  }
}
