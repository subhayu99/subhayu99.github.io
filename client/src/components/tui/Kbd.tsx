import type { ReactNode } from 'react';

interface KbdProps {
  /** Content — typically a key label like `⌃K`, `↑↓`, `Esc`, `Tab`. */
  children: ReactNode;
  /** Make the chip more prominent — used for the currently-active
      binding in a palette or status bar. */
  active?: boolean;
  className?: string;
}

/**
 * Keyboard-key chip. Used in help, command palette, status bar, and
 * reverse-search — wherever the UI surfaces a hotkey. The look is
 * deliberately quiet: thin border, small uppercase mono text, barely
 * any padding.
 */
export function Kbd({ children, active = false, className = '' }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded-sm border px-1 py-[0.5px] font-mono text-[10px] leading-none tabular-nums
        ${active
          ? 'border-terminal-bright-green text-terminal-bright-green bg-terminal-bright-green/10'
          : 'border-tui-accent-dim/60 text-tui-accent-dim'}
        ${className}`}
    >
      {children}
    </kbd>
  );
}
