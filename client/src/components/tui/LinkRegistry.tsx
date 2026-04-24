import { createContext, useContext, type ReactNode } from 'react';

/**
 * Terminal-wide numbered-link registry. Populated by `NumberedLink`
 * as blocks render, drained by the `o N` / `g N` keyboard resolver
 * in `Terminal.tsx`. Reset on `clear`.
 *
 * Numbers are assigned the first time a given `href` appears since
 * the last reset and are stable across re-renders — typing `o 5`
 * always opens the same link until cleared.
 */

export interface TerminalLink {
  n: number;
  href: string;
  label: string;
}

export interface TerminalLinkRegistry {
  /** Register a link, returning its assigned number. Duplicate hrefs
   *  return the same number — a link appearing twice in the same
   *  block reads as `[3]` both times. */
  register: (href: string, label: string) => number;
  resolve: (n: number) => TerminalLink | undefined;
  /** Snapshot of all registered links (for the palette / debug). */
  all: () => TerminalLink[];
  /** Clear the registry. Called on `clearTerminal`. */
  reset: () => void;
}

export const TerminalLinkContext = createContext<TerminalLinkRegistry | null>(null);

export function useTerminalLinks(): TerminalLinkRegistry | null {
  return useContext(TerminalLinkContext);
}

/** Thin wrapper so consumers import a single component instead of
 *  dealing with raw context. */
export function TerminalLinkProvider({
  value,
  children,
}: {
  value: TerminalLinkRegistry;
  children: ReactNode;
}) {
  return (
    <TerminalLinkContext.Provider value={value}>{children}</TerminalLinkContext.Provider>
  );
}
