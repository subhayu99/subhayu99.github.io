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
  /** Legacy prop — used to hide the inline `[N]` tag. The tag has
      since been removed entirely; this is kept as a no-op so existing
      call sites compile. */
  silent?: boolean;
}

/**
 * External http/https link. Opens in a new tab with `noopener
 * noreferrer`. Still registers with the terminal-wide registry so the
 * `open N` command resolves it; the visible `[N]` suffix has been
 * removed to keep outputs uncluttered.
 */
export function ExtLink({ href, children, className = '' }: ExtLinkProps) {
  const registry = useTerminalLinks();
  const label = typeof children === 'string' ? children : href;
  useMemo(
    () => (registry ? registry.register(href, label) : null),
    [registry, href, label],
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-terminal-bright-green underline hover:opacity-80 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green ${className}`}
    >
      {children}
    </a>
  );
}
