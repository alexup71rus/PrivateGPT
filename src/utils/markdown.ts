import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

const markedInstance = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code, { language }).value;

      return `
        <div class="code-block-wrapper">
          <button class="copy-button">Copy</button>
          <pre><code class="hljs language-${language}">${highlighted
            .split("\n")
            .map((line, i) =>
              `<div class="code-line"><span class="line-number">${i + 1}</span><span class="line-content">${line}</span></div>`
            )
            .join("\n")}</code></pre>
        </div>
      `;
    },
  }),
  {
    renderer: {
      link(token): string | false {
        const { href, title, text } = token;
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}" target="_blank" rel="noopener"${titleAttr}>${text}</a>`;
      },
    },
  }
);

export function wrapThinkBlocks(html: string): string {
  if (html.includes('</think>')) {
    return html.replace(/<\/think>[\s\S]*/gi, '');
  } else if (html.includes('<think>')) {
    return html;
  }

  return '';
}

function removeThinkBlocks(html: string): string {
  let result = html.replace(/<think>[\s\S]*?<\/think>/gi, '');

  result = result.replace(/<think>[\s\S]*/gi, '');

  return result;
}

export function parseMarkdown(markdown: string, isThink = false) {
  const rawHtml = markedInstance.parse(markdown) as string;
  return isThink ? wrapThinkBlocks(rawHtml) : removeThinkBlocks(rawHtml);
}
