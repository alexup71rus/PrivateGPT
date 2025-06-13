import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { WebUtilsService } from '../web-utils/web-utils.service';
import { LinkContent } from './link-parser.resolver';
import { MAX_HTML_SIZE, MAX_URL_LENGTH } from '../common/constants';

@Injectable()
export class LinkParserService {
  private readonly logger = new Logger(LinkParserService.name);

  constructor(private readonly webUtilsService: WebUtilsService) {}

  // Fetches and processes content from provided URLs
  async fetchLinkContent(urls: string[]): Promise<LinkContent> {
    try {
      if (!urls || !urls.length) {
        throw new Error('No URLs provided');
      }

      // Filter valid URLs
      const validUrls = urls.filter((url) => {
        if (!url || url === 'undefined' || !url.trim()) return false;
        let decodedUrl: string;
        try {
          decodedUrl = decodeURIComponent(url.trim());
        } catch {
          this.logger.warn(`Failed to decode URL: ${url}`);
          return false;
        }
        if (decodedUrl.length > MAX_URL_LENGTH) return false;
        try {
          new URL(decodedUrl);
          return /^https?:\/\/[^\s/$.?#]+.[^\s]*$/.test(decodedUrl);
        } catch {
          return false;
        }
      });

      if (!validUrls.length) {
        throw new Error('No valid URLs provided');
      }

      // Process URLs concurrently with a limit
      const limitFn = pLimit(3);
      const results = await Promise.all(
        validUrls.map((url) =>
          limitFn(async () => {
            try {
              const content = await this.webUtilsService.parseHtmlContent(
                url,
                MAX_HTML_SIZE,
              );
              return { url, content };
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              return { url, content: `Failed to load: ${errorMessage}` };
            }
          }),
        ),
      );

      // Combine content from all URLs
      const combinedContent = results
        .map((result) => `Content from ${result.url}:\n${result.content}`)
        .join('\n\n');

      return { content: combinedContent };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        content: '',
        error: `Failed to load content: ${errorMessage}`,
      };
    }
  }
}
