import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CommandMetadata } from '../../hooks/useTerminal';
import { Kbd } from './Kbd';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** All commands available given the current portfolio data. */
  commands: CommandMetadata[];
  /** Newest-first history (for the Recents section). */
  recentCommands: string[];
  /** Execute a command string (as if typed). */
  onExecute: (cmd: string) => void;
}

/**
 * Warp / VS Code-style fuzzy command palette. Triggered by Ctrl+K or
 * Cmd+K anywhere in the TUI; typing filters the command list in real
 * time. The right pane shows a short preview (description + aliases
 * + argsHint) for the highlighted entry.
 *
 * When input is empty, the list shows "recents" (the 3 most-recent
 * commands) pinned at the top, then the full command list.
 */
export function CommandPalette({
  open,
  onClose,
  commands,
  recentCommands,
  onExecute,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state on open; focus input so typing is instant.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // One paint to ensure the dialog is mounted before focus.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // ESC anywhere closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Build the ranked, filtered list.
  const entries = useMemo(
    () => buildEntries(commands, recentCommands, query),
    [commands, recentCommands, query],
  );
  const active = entries[cursor];

  // Clamp cursor when entry count changes.
  useEffect(() => {
    if (cursor >= entries.length) setCursor(Math.max(0, entries.length - 1));
  }, [entries.length, cursor]);

  // Scroll the active row into view on cursor move.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${cursor}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const runActive = useCallback(() => {
    if (!active) return;
    const cmdStr = active.argsHint
      ? active.name // leave args for the user to fill after selection
      : active.name;
    onClose();
    // Defer one frame so the overlay unmounts before the command fires.
    requestAnimationFrame(() => onExecute(cmdStr));
  }, [active, onClose, onExecute]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-[18vh] px-4"
    >
      <div className="relative bg-terminal-black border border-tui-accent-dim/50 border-l-[3px] border-l-terminal-bright-green w-full max-w-2xl terminal-glow flex flex-col max-h-[70vh]">
        {/* Punched-through title */}
        <div className="pointer-events-none absolute -top-2.5 left-3 right-3 flex items-center justify-between font-mono text-xs">
          <span className="bg-terminal-black px-2 text-terminal-bright-green pointer-events-auto">
            // palette
          </span>
          <span className="bg-terminal-black px-2 text-tui-muted pointer-events-auto">
            <Kbd>esc</Kbd> to close
          </span>
        </div>

        {/* Search input */}
        <div className="flex items-center border-b border-tui-accent-dim/30 px-3 pt-4 pb-2 font-mono">
          <span className="text-terminal-bright-green text-xs mr-2">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => (c + 1) % Math.max(1, entries.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => (c - 1 + entries.length) % Math.max(1, entries.length));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runActive();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                if (active) setQuery(active.name);
              }
            }}
            placeholder="type to filter commands…"
            className="flex-1 bg-transparent text-terminal-green outline-none text-sm placeholder:text-tui-muted"
            aria-label="filter commands"
            spellCheck="false"
            autoComplete="off"
          />
          {entries.length > 0 && (
            <span className="text-tui-muted text-[10px] tabular-nums ml-2">
              {cursor + 1}/{entries.length}
            </span>
          )}
        </div>

        {/* Results + preview */}
        <div className="flex-1 grid grid-cols-5 overflow-hidden">
          <div
            ref={listRef}
            role="listbox"
            aria-label="commands"
            className="col-span-3 overflow-y-auto scrollbar-terminal border-r border-tui-accent-dim/30 py-1"
          >
            {entries.length === 0 && (
              <div className="p-4 text-tui-muted text-xs font-mono">
                no commands match "{query}"
              </div>
            )}
            {entries.map((entry, i) => (
              <button
                key={entry.key}
                data-idx={i}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => {
                  setCursor(i);
                  runActive();
                }}
                className={`w-full text-left px-3 py-1 flex items-center justify-between gap-3 font-mono text-xs sm:text-sm border-l-2 ${
                  i === cursor
                    ? 'border-terminal-bright-green bg-terminal-bright-green/10 text-terminal-bright-green'
                    : 'border-transparent text-terminal-green hover:bg-terminal-bright-green/5'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {entry.recent && (
                    <span className="text-tui-muted text-[9px] shrink-0">
                      recent
                    </span>
                  )}
                  <span className="truncate">{entry.name}</span>
                  {entry.argsHint && (
                    <span className="text-tui-accent-dim text-[10px] shrink-0">
                      {entry.argsHint}
                    </span>
                  )}
                </span>
                <span className="text-tui-muted text-[10px] shrink-0 hidden sm:inline">
                  {entry.category}
                </span>
              </button>
            ))}
          </div>
          <div className="col-span-2 p-3 overflow-y-auto scrollbar-terminal font-mono text-xs">
            {active ? (
              <div className="space-y-2">
                <div className="text-tui-accent-dim">// preview</div>
                <div className="text-terminal-bright-green text-sm">
                  {active.name}
                  {active.argsHint && (
                    <span className="text-tui-accent-dim ml-1 text-xs">
                      {active.argsHint}
                    </span>
                  )}
                </div>
                <div className="text-white/80 leading-relaxed">
                  {active.description}
                </div>
                {active.aliases && active.aliases.length > 0 && (
                  <div className="text-tui-muted text-[10px]">
                    aliases: {active.aliases.join(', ')}
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-tui-accent-dim/30 text-[10px] text-tui-muted space-y-0.5">
                  <div>
                    <Kbd>↵</Kbd> run
                  </div>
                  <div>
                    <Kbd>tab</Kbd> complete into input
                  </div>
                  <div>
                    <Kbd>↑↓</Kbd> navigate
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-tui-muted">no selection</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Matcher ──

interface PaletteEntry extends CommandMetadata {
  key: string;
  recent: boolean;
  /** Lower = better; used for sort. */
  score: number;
}

function buildEntries(
  commands: CommandMetadata[],
  recents: string[],
  query: string,
): PaletteEntry[] {
  const q = query.trim().toLowerCase();

  // Recents — dedup and preserve newest-first; cap at 3.
  const seen = new Set<string>();
  const recentNames: string[] = [];
  for (const r of recents) {
    const base = r.trim().split(/\s+/)[0]?.toLowerCase();
    if (!base || seen.has(base)) continue;
    if (commands.some((c) => c.name === base || c.aliases?.includes(base))) {
      recentNames.push(base);
      seen.add(base);
      if (recentNames.length >= 3) break;
    }
  }

  // Empty query — recents pinned, then full list alphabetised.
  if (!q) {
    const out: PaletteEntry[] = [];
    for (const name of recentNames) {
      const c = commands.find((x) => x.name === name || x.aliases?.includes(name));
      if (c) out.push({ ...c, key: `recent:${c.name}`, recent: true, score: 0 });
    }
    const already = new Set(out.map((e) => e.name));
    for (const c of commands) {
      if (already.has(c.name)) continue;
      out.push({ ...c, key: c.name, recent: false, score: 0 });
    }
    return out;
  }

  // Filtered — score each command.
  const scored: PaletteEntry[] = [];
  for (const c of commands) {
    const score = fuzzyScore(q, c);
    if (score === null) continue;
    scored.push({
      ...c,
      key: c.name,
      recent: recentNames.includes(c.name),
      score,
    });
  }
  scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return scored;
}

/** Lower = better match. `null` = no match. */
function fuzzyScore(q: string, cmd: CommandMetadata): number | null {
  const candidates = [cmd.name, ...(cmd.aliases ?? []), cmd.description.toLowerCase()];
  let best: number | null = null;
  for (const cand of candidates) {
    const s = scoreAgainst(q, cand.toLowerCase());
    if (s !== null && (best === null || s < best)) best = s;
  }
  return best;
}

function scoreAgainst(q: string, target: string): number | null {
  if (!target.length) return null;
  // Exact match — best.
  if (target === q) return 0;
  // Prefix — very good.
  if (target.startsWith(q)) return 1 + target.length - q.length;
  // Contains — good.
  const idx = target.indexOf(q);
  if (idx !== -1) return 10 + idx;
  // Subsequence — e.g. "abt" matches "about".
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = target.indexOf(ch, ti);
    if (found === -1) return null;
    ti = found + 1;
  }
  return 50 + target.length - q.length;
}
