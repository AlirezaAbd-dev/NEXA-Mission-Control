/**
 * Converts markdown text (including images, links, autolinks, headings, lists)
 * into rich HTML that can be rendered safely by Tiptap and standard browser DOM.
 */
export function formatDescriptionHtml(content: string): string {
  if (!content) return "";

  const trimmed = content.trim();

  // If already rich HTML with block tags and NOT raw markdown image
  const hasHtmlTags = /<(?:p|div|h[1-6]|ul|ol|table|blockquote|pre)[\s>]/i.test(trimmed);
  const hasMarkdownImg = /!\[.*?\]\(.*?\)/.test(trimmed);
  const hasMarkdownLink = /(?:\[.*?\]\(.*?\)|\<(?:https?:\/\/)[^\s>]+\>)/.test(trimmed);

  // If pure HTML without raw markdown syntax, return as-is
  if (hasHtmlTags && !hasMarkdownImg && !hasMarkdownLink) {
    return trimmed;
  }

  // Convert markdown image: ![alt](url_or_data_uri)
  let html = content.replace(
    /!\[(.*?)\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=\\\s]+|https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
    (_match, alt, src) => {
      const cleanSrc = src.startsWith("data:image/")
        ? src.replace(/\s+/g, "").replace(/\\([+/=])/g, "$1").replace(/\\/g, "")
        : src;
      return `<img src="${cleanSrc}" alt="${alt || "image"}" class="max-w-full h-auto rounded-xl border border-slate-200 dark:border-[#183035] shadow-md my-3.5" />`;
    },
  );

  // Also clean any existing <img src="data:image/..."> with escaped backslashes
  html = html.replace(
    /<img([^>]+)src=["'](data:image\/[^;]+;base64,[^"']+)["']([^>]*)>/gi,
    (_match, pre, src, post) => {
      const cleanSrc = src.replace(/\s+/g, "").replace(/\\([+/=])/g, "$1").replace(/\\/g, "");
      return `<img${pre}src="${cleanSrc}"${post}>`;
    },
  );

  // Convert markdown link: [text](url)
  html = html.replace(
    /\[(.*?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
    (_match, text, url) =>
      `<a href="${url}" target="_blank" rel="noreferrer" class="text-teal-600 dark:text-teal-400 underline font-medium hover:opacity-80">${text}</a>`,
  );

  // Convert autolinks: <https://...>
  html = html.replace(
    /<(https?:\/\/[^\s>]+)>/g,
    (_match, url) =>
      `<a href="${url}" target="_blank" rel="noreferrer" class="text-teal-600 dark:text-teal-400 underline font-medium hover:opacity-80">${url}</a>`,
  );

  // If content was not already structured in HTML paragraphs, convert newlines
  if (!hasHtmlTags) {
    const lines = html.replace(/\r\n/g, "\n").split("\n");
    const blocks: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // If line is already an image block, don't wrap in p tag
      if (line.trim().startsWith("<img")) {
        blocks.push(line.trim());
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        blocks.push(`<h${level}>${headingMatch[2]}</h${level}>`);
        continue;
      }

      if (line.trim()) {
        blocks.push(`<p>${line}</p>`);
      } else {
        blocks.push("<p><br></p>");
      }
    }
    return blocks.join("");
  }

  return html;
}
