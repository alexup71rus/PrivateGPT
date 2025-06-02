import fetch from 'node-fetch';

export class SearchService {
  async search(
    query: string,
    searxngUrl: string,
    format: string,
  ): Promise<string> {
    if (format !== 'json') {
      console.warn('Only JSON format is supported currently');
      return '';
    }

    try {
      const response = await fetch(
        searxngUrl.replace('%s', encodeURIComponent(query)),
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      const data: any = await response.json();

      const results: any = (data.results || []).map((item: any) => {
        console.log(item);
        const title = item.title || 'No title';
        const content = item.content || item.snippet || 'No content';
        const url = item.url || 'No URL';
        // const publishedDate = item.publishedDate || item.date || 'No date';
        // const metadata = item.metadata || 'No metadata';

        return `[Title: ${title}] [URL: ${url}] [Content: ${content}]`;
      });

      return results.length ? results.join('\n') : '';
    } catch (error) {
      console.error('SearchService error:', error);
      return '';
    }
  }
}
