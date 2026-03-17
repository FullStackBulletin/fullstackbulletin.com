import { addUtmParams } from './utm';

export function renderSimpleMarkdown(text: string | null, issueNumber?: number, content?: string): string {
  if (!text) return '';
  // First, escape HTML entities so raw tags in text don't become real elements
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Then apply markdown-to-HTML conversions
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
      const href = issueNumber != null && content ? addUtmParams(url, issueNumber, content) : url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    });
}
