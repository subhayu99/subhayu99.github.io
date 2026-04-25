import type { ReactNode } from 'react';
import { Kbd } from './Kbd';
import { ctrlKey, altKey, isTouchDevice } from '../../lib/platform';

export interface StatusBarActions {
  help: () => void;
  search: () => void;
  cmd: () => void;
  recall: () => void;
  palette: () => void;
  cycleTheme: () => void;
  toGui: () => void;
  matrix: () => void;
  clear: () => void;
}

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
  /** Click/tap handlers for each chip — wired so the chips work as
   *  buttons on touch devices (where modifier shortcuts don't exist)
   *  and as tappable affordances on desktop too. */
  actions: StatusBarActions;
  /** When in `search` mode, supply current match position so the
   *  status bar can show contextual hints in place of the chips. */
  searchInfo?: {
    matchIndex: number;
    matchCount: number;
  };
}

/**
 * Persistent footer strip — single row. Hints scroll-snap on the left,
 * a compact meta cluster (mode · theme) right-aligned on wider screens.
 *
 * Each chip is a real button — tapping fires the same action the
 * keyboard shortcut would. Modifier symbols swap per OS (⌃/⌥ on Mac,
 * Ctrl/Alt elsewhere). On touch devices the modifier-based chips are
 * hidden (no Ctrl/Alt key on phones); the action is still reachable
 * by typing the underlying command.
 */
export function StatusBar({
  themeName,
  mode = 'insert',
  actions,
  searchInfo,
}: StatusBarProps) {
  return (
    <footer
      role="toolbar"
      aria-label="terminal hints"
      // pb adds safe-area for iPhones with a home bar so chips don't
      // sit under the indicator. With h-dvh on the outer shell, the
      // strip lifts above the soft keyboard automatically when it opens.
      className="flex-shrink-0 border-t border-tui-accent-dim/30 bg-terminal-black px-2 sm:px-3 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] font-mono text-[10px] sm:text-[11px] leading-tight"
    >
      <div className="max-w-4xl flex items-center gap-x-3">
        {mode === 'search' ? (
          // Search-mode chips — replace the normal hint cluster so the
          // reverse-search hints don't pop in as a third row above the
          // status bar. Same row, same height, contextual contents.
          <div className="flex items-center gap-x-2 sm:gap-x-3 overflow-x-auto scrollbar-hide whitespace-nowrap flex-1 min-w-0">
            <span className="text-tui-accent-dim tabular-nums">
              {searchInfo && searchInfo.matchCount > 0
                ? `${searchInfo.matchIndex + 1}/${searchInfo.matchCount}`
                : 'no match'}
            </span>
            <Hint chip={`${ctrlKey}R`} label="next" onTap={actions.recall} />
            <Hint chip="↵" label="run" />
            <Hint chip="tab" label="edit" />
            <Hint chip="esc" label="cancel" />
          </div>
        ) : (
          // Hint row — chips are buttons. Bare-key chips (?, /, :) work
          // on every platform. On touch we still surface the modifier-
          // backed actions (recall/palette/theme/gui/matrix/clear) but
          // drop the meaningless ⌃/⌥ glyphs and render them as plain
          // bracketed labels so users get one-tap access to the same
          // functionality desktop users get from the keyboard. Strip is
          // horizontally scrollable for narrow screens.
          <div className="flex items-center gap-x-2 sm:gap-x-3 overflow-x-auto scrollbar-hide whitespace-nowrap flex-1 min-w-0">
            <Hint chip="?" label="help" onTap={actions.help} />
            <Hint chip="/" label="search" onTap={actions.search} />
            <Hint chip=":" label="cmd" onTap={actions.cmd} />
            {isTouchDevice ? (
              <>
                <TouchChip label="recall" onTap={actions.recall} />
                <TouchChip label="palette" onTap={actions.palette} />
                <TouchChip label="theme" onTap={actions.cycleTheme} />
                <TouchChip label="gui" onTap={actions.toGui} />
                <TouchChip label="matrix" onTap={actions.matrix} />
                <TouchChip label="clear" onTap={actions.clear} />
              </>
            ) : (
              <>
                <Hint chip={`${ctrlKey}R`} label="recall" onTap={actions.recall} />
                <Hint chip={`${ctrlKey}K`} label="palette" onTap={actions.palette} />
                <Hint chip={`${altKey}T`} label="theme" onTap={actions.cycleTheme} />
                <Hint chip={`${altKey}G`} label="gui" onTap={actions.toGui} />
                <Hint chip={`${altKey}M`} label="matrix" onTap={actions.matrix} />
                <Hint chip={`${ctrlKey}L`} label="clear" onTap={actions.clear} />
              </>
            )}
          </div>
        )}
        {/* Compact meta — only on wider screens. mode shows when not
            insert (search/palette make it useful); theme is the soft
            anchor for "what skin am I in". */}
        <div className="hidden md:flex items-center gap-x-2 text-tui-muted whitespace-nowrap flex-shrink-0">
          <span className={mode !== 'insert' ? 'text-terminal-bright-green' : 'text-tui-accent-dim'}>
            {mode}
          </span>
          <span className="text-tui-muted/40" aria-hidden="true">·</span>
          <span className="text-tui-accent-dim">{themeName}</span>
        </div>
      </div>
    </footer>
  );
}

function Hint({
  chip,
  label,
  onTap,
}: {
  chip: ReactNode;
  label: string;
  onTap?: () => void;
}) {
  const inner = (
    <>
      <Kbd>{chip}</Kbd>
      <span>{label}</span>
    </>
  );
  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label={label}
        className="inline-flex items-center gap-1 text-tui-muted hover:text-terminal-bright-green focus-visible:outline-none focus-visible:text-terminal-bright-green transition-colors"
      >
        {inner}
      </button>
    );
  }
  return <span className="inline-flex items-center gap-1 text-tui-muted">{inner}</span>;
}

/** Touch-device variant of Hint — no kbd glyph (modifier keys don't
 *  exist on phones), just a `[label]` chip that fires the same action.
 *  Slightly bigger tap target than the desktop hint so it's reachable
 *  on a small screen. */
function TouchChip({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      className="inline-flex items-center rounded-sm border border-tui-accent-dim/40 px-1.5 py-[1px] text-tui-muted hover:text-terminal-bright-green hover:border-terminal-bright-green/60 active:bg-terminal-bright-green/10 focus-visible:outline-none focus-visible:text-terminal-bright-green focus-visible:border-terminal-bright-green transition-colors"
    >
      {label}
    </button>
  );
}
