import hljs from "highlight.js";
import {Marked} from "marked";
import {markedHighlight} from "marked-highlight";

export const marked = new Marked(
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
    }
  })
);
