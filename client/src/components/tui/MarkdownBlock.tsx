import { Fragment, type ReactNode } from 'react';

/**
 * Charm-Glow-style markdown renderer for the TUI.
 *
 * Handles the subset we actually use in the portfolio: headings
 * (h1–h3), paragraphs, fenced code blocks (```), inline code,
 * unordered + ordered lists, blockquotes, bold (**), italic (*),
 * and [text](url) links. Output uses the new Block token palette:
 * left-rail rules, sharp corners, accent-dim secondary.
 *
 * Why a hand-roll instead of `marked`: it's ~120 lines and keeps
 * the output strictly JSX — no `dangerouslySetInnerHTML`, so the
 * link registry (phase 7) can auto-register every anchor.
 */

interface MarkdownBlockProps {
  /** The markdown source to render. */
  source: string;
  /** Tighter spacing — used inline in highlight bullets. */
  inline?: boolean;
}

export function MarkdownBlock({ source, inline = false }: MarkdownBlockProps) {
  const blocks = parseBlocks(source);
  return (
    <div className={inline ? 'space-y-1' : 'space-y-3'}>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  );
}

// ── Block-level parsing ──

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'code'; lang?: string; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'blockquote'; text: string }
  | { kind: 'hr' };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim() || undefined;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ kind: 'code', lang, text: buf.join('\n') });
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length as 1 | 2 | 3, text: h[2].trim() });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Blockquote — collapse contiguous `> ` lines into one block.
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'blockquote', text: buf.join(' ') });
      continue;
    }

    // Unordered list — `- item` or `* item`.
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered: false, items });
      continue;
    }

    // Ordered list — `1. item`.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered: true, items });
      continue;
    }

    // Blank line — separator, skip.
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Paragraph — collect until blank line / next block.
    const buf: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: buf.join(' ') });
  }

  return blocks;
}

// ── Rendering ──

function renderBlock(block: Block): ReactNode {
  switch (block.kind) {
    case 'heading':
      return <Heading level={block.level} text={block.text} />;
    case 'code':
      return <CodeBlock lang={block.lang} text={block.text} />;
    case 'paragraph':
      return <p className="text-white/90 leading-relaxed">{renderInline(block.text)}</p>;
    case 'list':
      return (
        <ul className="ml-1 space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className="text-white/90 leading-relaxed flex gap-2">
              <span className="text-tui-accent-dim shrink-0 mt-[2px]">
                {block.ordered ? `${i + 1}.` : '·'}
              </span>
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-tui-accent-dim/60 pl-3 italic text-white/80">
          {renderInline(block.text)}
        </blockquote>
      );
    case 'hr':
      return <hr className="border-t border-tui-accent-dim/30" />;
  }
}

function Heading({ level, text }: { level: 1 | 2 | 3; text: string }) {
  if (level === 1) {
    return (
      <h1 className="flex items-baseline gap-2 text-terminal-bright-green font-bold text-base sm:text-lg">
        <span aria-hidden="true" className="text-terminal-bright-green">▎</span>
        <span>{renderInline(text)}</span>
      </h1>
    );
  }
  if (level === 2) {
    return (
      <h2 className="text-tui-accent-dim text-sm sm:text-base">
        {/* Ratatui-style side-ruled heading */}
        ── {renderInline(text)} ──
      </h2>
    );
  }
  return (
    <h3 className="text-terminal-green text-sm">
      <span aria-hidden="true" className="text-tui-accent-dim">· </span>
      {renderInline(text)}
    </h3>
  );
}

function CodeBlock({ lang, text }: { lang?: string; text: string }) {
  return (
    <div className="relative border-l-2 border-tui-accent-dim/60 pl-3 bg-transparent font-mono text-xs leading-relaxed">
      {lang && (
        <div className="text-tui-muted text-[10px] mb-1 uppercase tracking-wide">
          {lang}
        </div>
      )}
      <pre className="text-terminal-green whitespace-pre-wrap break-words">{text}</pre>
    </div>
  );
}

// ── Inline parsing: code, link, bold, italic ──

function renderInline(text: string): ReactNode {
  // Tokenise in order of precedence. Code first (opaque), then links,
  // then bold, then italic. Plain text is the fallback.
  const tokens = tokeniseInline(text);
  return tokens.map((t, i) => {
    switch (t.kind) {
      case 'code':
        return (
          <code
            key={i}
            className="text-terminal-bright-green bg-terminal-bright-green/10 px-1 py-0.5 border border-tui-accent-dim/30 text-[0.92em] font-mono"
          >
            {t.text}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-bright-green underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green"
          >
            {t.text}
          </a>
        );
      case 'bold':
        return (
          <strong key={i} className="font-bold text-white">
            {renderInline(t.text)}
          </strong>
        );
      case 'italic':
        return (
          <em key={i} className="italic text-white/90">
            {renderInline(t.text)}
          </em>
        );
      case 'text':
        return <Fragment key={i}>{t.text}</Fragment>;
    }
  });
}

type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string };

function tokeniseInline(src: string): InlineToken[] {
  const out: InlineToken[] = [];
  let i = 0;
  let buf = '';
  const flushText = () => {
    if (buf) {
      out.push({ kind: 'text', text: buf });
      buf = '';
    }
  };

  while (i < src.length) {
    const ch = src[i];

    // Inline code — `…`
    if (ch === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) {
        flushText();
        out.push({ kind: 'code', text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Link — [text](url)
    if (ch === '[') {
      const close = src.indexOf(']', i + 1);
      if (close !== -1 && src[close + 1] === '(') {
        const urlEnd = src.indexOf(')', close + 2);
        if (urlEnd !== -1) {
          const href = src.slice(close + 2, urlEnd);
          if (/^https?:\/\//.test(href)) {
            flushText();
            out.push({ kind: 'link', text: src.slice(i + 1, close), href });
            i = urlEnd + 1;
            continue;
          }
        }
      }
    }

    // Bold — **text**
    if (ch === '*' && src[i + 1] === '*') {
      const end = src.indexOf('**', i + 2);
      if (end !== -1) {
        flushText();
        out.push({ kind: 'bold', text: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Italic — *text* (not part of **). Skip if adjacent asterisk.
    if (ch === '*' && src[i + 1] !== '*') {
      const end = indexOfItalicClose(src, i + 1);
      if (end !== -1) {
        flushText();
        out.push({ kind: 'italic', text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flushText();
  return out;
}

function indexOfItalicClose(src: string, from: number): number {
  for (let i = from; i < src.length; i++) {
    if (src[i] === '*' && src[i + 1] !== '*') return i;
  }
  return -1;
}
