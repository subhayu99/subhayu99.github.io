import DOMPurify from 'dompurify';

/**
 * Renders markdown-flavored text as sanitized HTML for GUI components.
 * Handles: **bold**, [links](url), HTML tags from data pipeline, escape sequences.
 */
export function renderGuiMarkdown(text: string): string {
  let result = text;

  // 1. Strip HTML tags from the data pipeline (<b>, </b>, etc.)
  result = result.replace(/<[^>]+>/g, '');

  // 2. Handle escape sequences — clean up backslash escapes from YAML
  result = result.replace(/\\\s*/g, ' '); // any backslash + optional whitespace → space
  result = result.replace(/\\</g, '&lt;');
  result = result.replace(/\\>/g, '&gt;');

  // 3. Convert markdown bold **text** → styled strong
  result = result.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-white font-semibold">$1</strong>'
  );

  // 4. Convert markdown links [text](url) → styled anchor
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-gui-accent hover:underline underline-offset-2 transition-colors">$1</a>'
  );

  // 5. Clean up multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();

  // 6. Sanitize — use ADD_ATTR to extend defaults rather than replacing
  return DOMPurify.sanitize(result, {
    ADD_ATTR: ['target', 'rel', 'class'],
    ADD_TAGS: ['strong'],
  });
}

/**
 * Strips all markdown/HTML to plain text.
 */
export function stripToPlainText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\\\s*/g, ' ')
    .replace(/\\</g, '<')
    .replace(/\\>/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extracts the most impactful metric from a list of highlight strings.
 */
export function extractMetric(highlights: string[]): string | null {
  const patterns = [
    /\$\d+[\d,.]*[MBKmk]?\b/,
    /\d+[\d,.]*%\+?\s*(?:gain|reduction|faster|improvement|accuracy)?/i,
    /\d+[\d,.]*[hms]\s*(?:to|→)\s*(?:under\s*)?\d+[\d,.]*[hms]/i,
    /\d+[\d,.]*[xX]\s*(?:faster|improvement|gain)?/i,
    /\d+[\d,.]*[MBKmk]\+?\s*(?:records|contacts|rows|users|orders|downloads)/i,
  ];

  const plainHighlights = highlights.map(stripToPlainText);

  for (const pattern of patterns) {
    for (const h of plainHighlights) {
      const match = h.match(pattern);
      if (match) return match[0].trim();
    }
  }
  return null;
}
