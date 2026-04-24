import { useMemo, type ReactNode } from 'react';
import { useBlockLinks } from './Block';
import { useTerminalLinks } from './LinkRegistry';

interface NumberedLinkProps {
  /** Target URL. External links open in a new tab with noopener. */
  href: string;
  children: ReactNode;
  /** Override the accessible label used by the `o N` resolver.
      Defaults to the children if they are a plain string, else to
      the href. */
  label?: string;
  /** Hide the `[N]` tag — used when the link is inline prose and the
      tag would break the sentence. The link is still registered so
      `o N` works; it just doesn't display its own number. */
  silent?: boolean;
  className?: string;
}

/**
 * External link that registers itself with the terminal-wide link
 * registry so the user can open it keyboard-only with `o N` / `g N`
 * (vim-motion). When rendered outside a registry (e.g., in a test or
 * standalone render) it degrades gracefully to a plain external
 * link without a number.
 */
export function NumberedLink({
  href,
  children,
  label,
  silent = false,
  className = '',
}: NumberedLinkProps) {
  const terminalRegistry = useTerminalLinks();
  const blockRegistry = useBlockLinks();
  // Prefer terminal-wide registry (stable numbers across render).
  // Fall back to the Block's per-render registry so legacy contexts
  // keep working; finally no-op if neither is present.
  const registry = terminalRegistry ?? blockRegistry;

  const displayLabel =
    label ?? (typeof children === 'string' ? children : href);
  const n = useMemo(
    () => (registry ? registry.register(href, displayLabel) : null),
    [registry, href, displayLabel],
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={n !== null ? `${displayLabel} (link ${n})` : displayLabel}
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
