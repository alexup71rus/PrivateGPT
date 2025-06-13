import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { EXCLUDED_CLASSES, EXCLUDED_TAGS } from './web-utils.constants';

@Injectable()
export class WebUtilsService {
  private readonly logger = new Logger(WebUtilsService.name);
  private readonly EXCLUDE_SELECTOR = [
    ...EXCLUDED_TAGS,
    ...EXCLUDED_CLASSES.map((cls) => `.${cls}`),
  ].join(',');

  // Fetches and renders HTML content from a URL
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

        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            this.logger.warn(`JS error on page ${url}: ${msg.text()}`);
          }
        });

        const response = await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 90000,
        });
        if (!response?.ok()) {
          this.logger.warn(`HTTP status for ${url}: ${response?.status()}`);
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
              `Key selectors not found for ${url} on attempt ${attempt}`,
            );
          });

        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const html = await page.content();
        if (html.length < 100) {
          this.logger.warn(`HTML too short: ${html.slice(0, 100)}`);
        }
        return html;
      } catch (error) {
        this.logger.error(
          `Puppeteer error on attempt ${attempt} for ${url}: ${error.message}`,
        );
        if (attempt === retries) {
          throw new Error(
            `Failed to render ${url} after ${retries} attempts: ${error.message}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } finally {
        if (page) await page.close();
        if (browser) {
          await browser.close();
        }
      }
    }
    throw new Error('Unexpected rendering error');
  }

  // Extracts text from HTML elements recursively
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

  // Cleans text by normalizing whitespace and formatting
  public cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n')
      .replace(/,([^\s])/g, ', $1')
      .replace(/(\d)([^\d\s])/g, '$1 $2')
      .trim();
  }

  // Parses HTML content from a URL and extracts relevant text
  async parseHtmlContent(url: string, maxSize: number): Promise<string> {
    try {
      let decodedUrl = url;
      try {
        decodedUrl = decodeURIComponent(url);
      } catch (e) {
        this.logger.warn(`Failed to decode URL: ${url}`);
      }

      const html = await this.getRenderedHtml(decodedUrl);
      const $ = cheerio.load(html, { xmlMode: false });

      $(this.EXCLUDE_SELECTOR).remove();

      const metaDescription = this.cleanText(
        $('meta[name="description"]').attr('content') || '',
      );
      const ogDescription = this.cleanText(
        $('meta[property="og:description"]').attr('content') || '',
      );

      const contentBlocks: string[] = [];
      const processedTexts = new Set<string>();

      const containers = $('body')
        .find('section, article, main, h1, h2, h3, ul, ol, a, p, div')
        .filter((_, el) => {
          const text = this.extractText($, el);
          return text.length > 5;
        });

      containers.each((_, element) => {
        const text = this.cleanText(this.extractText($, element));
        if (text && !processedTexts.has(text)) {
          processedTexts.add(text);
          contentBlocks.push(text);
        }
      });

      let content = contentBlocks.join('\n---\n').trim();
      if (!content) {
        content =
          metaDescription ||
          ogDescription ||
          this.cleanText(this.extractText($, $('body'))) ||
          '';
      }

      if (!content) {
        content = this.cleanText($('body').text()) || 'Content unavailable';
      }

      if (content.length > maxSize) {
        content = content.slice(0, maxSize);
        const lastSpace = content.lastIndexOf(' ');
        if (lastSpace > maxSize * 0.8) {
          content = content.slice(0, lastSpace) + '...';
        }
      }

      if (content === 'Content unavailable') {
        this.logger.error(`Final content unavailable for ${decodedUrl}`);
      }
      return content;
    } catch (error) {
      this.logger.error(`Parsing error for ${url}: ${error.message}`);
      return 'Content unavailable';
    }
  }
}
