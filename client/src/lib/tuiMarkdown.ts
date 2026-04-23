/**
 * Inline markdown → HTML for TUI content.
 *
 * resume.yaml uses three inline-markdown patterns in highlights and
 * related text: **bold**, `code`, and [link text](url). The build
 * pipeline's `transforms.markdownToHtml` rule only covers bold and
 * requires rendercv to run. This helper covers all three and runs at
 * render time, so output is consistent regardless of upstream build
 * state.
 *
 * Order matters:
 *   1. Code spans first — so bold/link markers inside backticks stay literal.
 *   2. Links second — so bold inside link text still gets wrapped later.
 *   3. Bold last — runs over whatever's left.
 *
 * DOMPurify in the render pipeline allows <b>, <code>, <a href target rel>,
 * and class attributes — everything emitted here is preserved. URLs are
 * restricted to http/https as defence-in-depth; DOMPurify would strip
 * unsafe schemes anyway.
 */

export function inlineMd(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(
      /`([^`]+?)`/g,
      '<code class="text-terminal-bright-green bg-terminal-green/10 px-1 rounded text-[0.92em]">$1</code>',
    )
    .replace(
      /\[([^\]]+?)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-terminal-bright-green underline hover:opacity-80">$1</a>',
    )
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
