import { useMemo, type ReactNode } from 'react';
import { useBlockLinks } from './Block';
import { useTerminalLinks } from './LinkRegistry';

interface NumberedLinkProps {
  /** Target URL. External links open in a new tab with noopener. */
  href: string;
  children: ReactNode;
  /** Override the accessible label used by the `o N` / `open N`
      resolver. Defaults to the children if they are a plain string,
      else to the href. */
  label?: string;
  /** Legacy prop — used to hide the inline `[N]` tag. The tag has
      since been removed entirely (it was visual noise; the `open N`
      command is hint enough), so this prop is now a no-op kept for
      compatibility with existing call sites. */
  silent?: boolean;
  className?: string;
}

/**
 * External link that registers itself with the terminal-wide link
 * registry so the user can still open it keyboard-only with the
 * `open N` / `o N` / `g N` command. The visible `[N]` suffix has
 * been removed — it cluttered outputs and the URL itself is the
 * primary affordance.
 */
export function NumberedLink({
  href,
  children,
  label,
  className = '',
}: NumberedLinkProps) {
  const terminalRegistry = useTerminalLinks();
  const blockRegistry = useBlockLinks();
  const registry = terminalRegistry ?? blockRegistry;

  const displayLabel =
    label ?? (typeof children === 'string' ? children : href);
  // Still register so `open N` keeps working — just don't display N.
  useMemo(
    () => (registry ? registry.register(href, displayLabel) : null),
    [registry, href, displayLabel],
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={displayLabel}
      className={`text-terminal-bright-green underline hover:opacity-80 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green ${className}`}
    >
      {children}
    </a>
  );
}
