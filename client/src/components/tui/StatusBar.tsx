import { Kbd } from './Kbd';

interface StatusBarProps {
  /** Current theme display name (lowercase). */
  themeName: string;
  /** Count of output blocks in scrollback. */
  blockCount: number;
  /** Count of history entries. */
  historyCount: number;
  /** Input mode — `insert` normally, `search` during reverse-search,
   *  `palette` when the command palette is open. */
  mode?: 'insert' | 'search' | 'palette';
}

/**
 * Persistent footer strip — always visible. Two rows:
 *   - meta row (muted): mode · theme · blocks · history
 *   - hint row: key-chip hotkeys (lazygit / k9s / Ghostty idiom)
 *
 * On narrow screens the meta row compresses to just mode+theme and
 * the hints scroll horizontally via snap-x so they're still reachable.
 */
export function StatusBar({
  themeName,
  blockCount,
  historyCount,
  mode = 'insert',
}: StatusBarProps) {
  return (
    <footer
      role="toolbar"
      aria-label="terminal hints"
      className="flex-shrink-0 border-t border-tui-accent-dim/30 bg-terminal-black px-2 sm:px-3 py-1 font-mono text-[10px] sm:text-[11px] leading-tight"
    >
      {/* Content width-capped to match Block / prompt so the footer
          doesn't sprawl past the scrollback on wide monitors. The
          border-t (above) still spans full viewport. */}
      <div className="max-w-4xl">
      {/* Meta row — muted stats */}
      <div className="flex items-center gap-x-3 text-tui-muted mb-0.5 whitespace-nowrap overflow-x-auto scrollbar-hide">
        <MetaSegment label="mode" value={mode} accent={mode !== 'insert'} />
        <Sep />
        <MetaSegment label="theme" value={themeName} />
        <Sep className="hidden sm:inline" />
        <MetaSegment label="blocks" value={String(blockCount)} className="hidden sm:inline-flex" />
        <Sep className="hidden sm:inline" />
        <MetaSegment label="history" value={String(historyCount)} className="hidden sm:inline-flex" />
      </div>

      {/* Hint row — key chips. All wired at window level so they work
          even when focus is on a link or button. Alt+letter is used
          for t/g/m so pressing those letters doesn't eat the first
          char of a command. Non-letter keys (?, /, :) are safe as
          bare since they never start a command word. */}
      <div className="flex items-center gap-x-2 sm:gap-x-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
        <Hint chip="?" label="help" />
        <Hint chip="/" label="search" />
        <Hint chip=":" label="cmd" />
        <Hint chip="⌃R" label="recall" />
        <Hint chip="⌃K" label="palette" />
        <Hint chip="o N" label="open link" />
        <Hint chip="⌥T" label="theme" />
        <Hint chip="⌥G" label="gui" />
        <Hint chip="⌥M" label="matrix" />
        <Hint chip="⌃L" label="clear" />
      </div>
      </div>
    </footer>
  );
}

function MetaSegment({
  label,
  value,
  accent = false,
  className = '',
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="text-tui-muted/70">{label}:</span>
      <span className={accent ? 'text-terminal-bright-green' : 'text-tui-accent-dim'}>
        {value}
      </span>
    </span>
  );
}

function Sep({ className = '' }: { className?: string }) {
  return (
    <span className={`text-tui-muted/40 ${className}`} aria-hidden="true">
      ·
    </span>
  );
}

function Hint({ chip, label }: { chip: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-tui-muted">
      <Kbd>{chip}</Kbd>
      <span>{label}</span>
    </span>
  );
}
