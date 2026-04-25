import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * The canonical chrome primitive for every command's output.
 *
 * Visual grammar borrows from Textual / Ratatui (titled top border with
 * the title "punching through") and Warp (left rail as a hover-revealed
 * affordance, not a permanent fence). Default state: top hairline +
 * `// title` only, rail-space reserved but transparent. Hover state:
 * the rail lights up to mark the block as addressable. Avoids the
 * "every command is fenced" feeling of a permanent rail.
 *
 *   ─── // about ────────────────────────── 14:32 ──
 *
 *       body content
 *
 *   (on hover, a 3px accent-bright rail appears on the left)
 *
 * Title is `font-mono` in accent-bright; top border is accent-dim at
 * 40% opacity. Background is solid `terminal-black` so the title
 * punches through the top hairline cleanly.
 */

interface BlockProps {
  /** Title string — callers pass `// about` etc. This primitive does
      not prepend `// ` automatically so callers retain control. */
  title: string;
  /** Stable id used for Warp-style block addressing and a11y. */
  id?: string;
  /** Optional right-aligned timestamp string (e.g. "14:32:18"). */
  timestamp?: string;
  /** Additional controls rendered to the right of the title, left of
      the timestamp. Typically `[−]` / `[↻]` / `[⧉]` chips. */
  controls?: ReactNode;
  /** Body contents. */
  children: ReactNode;
  /** Override the default vertical rhythm inside the body. */
  bodyClassName?: string;
  /** Extra classes on the outer shell. */
  className?: string;
  /** Tight-body variant: no inner padding, for ASCII art / preformatted
      content that should hug the border. */
  dense?: boolean;
  /** Optional hero variant — wider max-width for welcome / replicate
      which hold more content than a typical command output. */
  wide?: boolean;
}

export function Block({
  title,
  id,
  timestamp,
  controls,
  children,
  bodyClassName,
  className = '',
  dense = false,
  wide = false,
}: BlockProps) {
  const widthCls = wide ? 'max-w-5xl' : 'max-w-4xl';
  const bodyCls =
    bodyClassName ??
    (dense
      ? 'text-sm sm:text-base'
      : 'p-3 pt-4 sm:p-4 sm:pt-5 space-y-3 sm:space-y-4 text-sm sm:text-base');

  // Title id for aria-labelledby. Stable across renders.
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      role="region"
      aria-labelledby={titleId}
      // Chrome: top hairline + title only by default. The left rail
      // is reserved (3px transparent) but invisible until hover —
      // Warp idiom. This stops every block reading as a fenced cell;
      // the title + top rule + my-4 spacing carry the delimitation,
      // and the rail becomes a hover-revealed "this is addressable"
      // affordance instead of a permanent fence.
      className={`tui-block group relative my-4 border-t border-tui-accent-dim/40 border-l-[3px] border-l-transparent hover:border-l-terminal-bright-green transition-colors duration-200 bg-terminal-black ${widthCls} ${className}`}
    >
      {/* Title row — positioned to straddle the top border so the text
          overlays the border line. Header extends from x=0 to right
          edge so the title's black background also clips the top
          border in the 3px rail-space (otherwise a stray `-` tick
          shows through where border-left is transparent). On hover
          the rail still appears below the title's height, so the
          "title on rail" reading is preserved. */}
      <header className="pointer-events-none absolute -top-2.5 -left-[3px] right-0 flex items-center justify-between font-mono text-xs sm:text-[13px]">
        <div className="pointer-events-auto flex items-center gap-2">
          <span
            id={titleId}
            className="bg-terminal-black pl-2 pr-3 text-terminal-bright-green tracking-wide"
          >
            {title}
          </span>
          {controls && (
            <span className="pointer-events-auto bg-terminal-black px-1 text-tui-muted">
              {controls}
            </span>
          )}
        </div>
        {timestamp && (
          <time className="pointer-events-auto bg-terminal-black pl-2 pr-3 text-tui-muted text-[10px] sm:text-[11px] tabular-nums">
            {timestamp}
          </time>
        )}
      </header>

      <BlockLinkProvider>
        <div className={bodyCls}>{children}</div>
      </BlockLinkProvider>
    </section>
  );
}

// ── Link registry (consumed in Phase 7 for `o N` / `g N` activation) ──

export interface BlockLinkInfo {
  n: number;
  href: string;
  label: string;
}

interface BlockLinkRegistry {
  register: (href: string, label: string) => number;
  getLink: (n: number) => BlockLinkInfo | undefined;
  all: () => BlockLinkInfo[];
}

const BlockLinkContext = createContext<BlockLinkRegistry | null>(null);

function BlockLinkProvider({ children }: { children: ReactNode }) {
  const counter = useRef(0);
  const mapRef = useRef<Map<number, BlockLinkInfo>>(new Map());
  // Reset each render — NumberedLink will re-register during the render
  // pass, producing a stable 1-based index by document order.
  counter.current = 0;
  mapRef.current.clear();

  const register = useCallback((href: string, label: string) => {
    const n = ++counter.current;
    mapRef.current.set(n, { n, href, label });
    return n;
  }, []);
  const getLink = useCallback((n: number) => mapRef.current.get(n), []);
  const all = useCallback(() => Array.from(mapRef.current.values()), []);

  const value = useMemo<BlockLinkRegistry>(
    () => ({ register, getLink, all }),
    [register, getLink, all],
  );
  return <BlockLinkContext.Provider value={value}>{children}</BlockLinkContext.Provider>;
}

export function useBlockLinks(): BlockLinkRegistry | null {
  return useContext(BlockLinkContext);
}

// ── Convenience hook: block header timestamp in a stable "HH:MM" form ──

/** Returns the current HH:MM:SS string, updated once a second. Useful
 *  as the `timestamp` prop on long-lived blocks. Most command outputs
 *  will pass a fixed string captured at execution time. */
export function useLiveClock(): string {
  const [now, setNow] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const t = setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatClock(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** One-shot clock — returns a "HH:MM:SS" string for now. Use this for
 *  block timestamps so they freeze at block creation. */
export function nowClock(): string {
  return formatClock(new Date());
}
