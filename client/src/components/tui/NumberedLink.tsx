import { useMemo, type ReactNode } from 'react';
import { useBlockLinks } from './Block';

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
 * External link that registers itself with the enclosing `Block` so
 * the user can open it with `o N` (vim-motion, wired in Phase 7).
 * Outside a `Block`, this renders as a plain external link without a
 * number — legacy contexts keep working.
 */
export function NumberedLink({
  href,
  children,
  label,
  silent = false,
  className = '',
}: NumberedLinkProps) {
  const registry = useBlockLinks();
  // useMemo so the registration is stable across re-renders within the
  // same Block (Block's provider resets its counter per render, so the
  // same link always claims the same number as long as render order is
  // deterministic).
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
