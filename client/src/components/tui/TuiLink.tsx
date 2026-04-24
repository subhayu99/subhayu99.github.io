import { useMemo, type ReactNode } from 'react';
import { useTerminalLinks } from './LinkRegistry';

interface CmdLinkProps {
  /** Target command name, e.g. "skills". Rendered as `?cmd=skills` so
      the browser's address bar reflects the navigation — consistent
      with the rest of the site's deep-link style. */
  cmd: string;
  children: ReactNode;
  /** Optional visual override; defaults to the accent-bright style. */
  className?: string;
}

/**
 * Internal command deep-link. Clicking it reloads with `?cmd=…`, which
 * is picked up by `useURLCommand` and executed on mount. Identical
 * behaviour to the existing `<a href="?cmd=foo">` pattern but typed.
 */
export function CmdLink({ cmd, children, className = '' }: CmdLinkProps) {
  return (
    <a
      href={`?cmd=${cmd}`}
      className={`text-terminal-bright-green font-semibold hover:text-terminal-bright-green hover:underline transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green ${className}`}
    >
      {children}
    </a>
  );
}

interface ExtLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Hide the `[N]` number tag. Default `false` — tags are visible
      so users discover the `o N` / `g N` open-by-number shortcut.
      Set `silent` for very short inline links that would disturb
      prose flow. */
  silent?: boolean;
}

/**
 * External http/https link. Opens in a new tab with `noopener
 * noreferrer`. Accent-underlined, with a `[N]` tag that resolves via
 * the terminal's link registry so `o N` / `g N` opens it keyboard-
 * only.
 */
export function ExtLink({ href, children, className = '', silent = false }: ExtLinkProps) {
  const registry = useTerminalLinks();
  const label = typeof children === 'string' ? children : href;
  const n = useMemo(
    () => (registry ? registry.register(href, label) : null),
    [registry, href, label],
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={n !== null ? `${label} (link ${n})` : undefined}
      className={`text-terminal-bright-green underline hover:opacity-80 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green ${className}`}
    >
      {children}
      {n !== null && !silent && (
        <span
          aria-hidden="true"
          className="ml-1 text-tui-muted text-[10px] sm:text-xs tabular-nums"
        >
          [{n}]
        </span>
      )}
    </a>
  );
}
