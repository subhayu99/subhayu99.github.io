import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTerminal } from '../hooks/useTerminal';
import { loadPortfolioData } from '../lib/portfolioDataLoader';
import { usePWA, useURLCommand } from '../hooks/usePWA';
import { uiText, apiConfig, getSavedTheme, colorThemes } from '../config';
import { StatusBar } from './tui/StatusBar';
import { CommandPalette } from './tui/CommandPalette';
import { TerminalLinkProvider } from './tui/LinkRegistry';
import { BootSequence } from './tui/BootSequence';
import { IdleMatrixRain } from './tui/IdleMatrixRain';

interface TerminalProps {
  onSwitchToGUI?: () => void;
}

function Terminal({ onSwitchToGUI }: TerminalProps) {
  const [hasTyped, setHasTyped] = useState(false);
  const [input, setInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const welcomeMessageShown = useRef(false);
  // A hidden mirror span we measure to place the cursor precisely.
  // Pixel-accurate across ligatures, zoom, and font-fallback — unlike
  // the old `input.length * 0.6em` estimate.
  const ghostRef = useRef<HTMLSpanElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const lastAnchoredCommandId = useRef<string | null>(null);
  const [cursorLeft, setCursorLeft] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // PWA functionality
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { urlCommand, clearCommand } = useURLCommand();

  // Load portfolio data
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['portfolio-data'],
    queryFn: loadPortfolioData,
    retry: apiConfig.query.retryAttempts,
    staleTime: apiConfig.query.cacheTime,
  });

  const {
    lines,
    executeCommand,
    navigateHistory,
    isBrowsingHistory,
    getCommandSuggestions,
    getAllCommands,
    clearTerminal,
    showWelcomeMessage,
    currentDir,
    lastExitCode,
    promptUser,
    promptHost,
    historyLength,
    getCommandMetadata,
    recentCommands,
    linkRegistry,
  } = useTerminal({
    portfolioData: portfolioData || null,
    onSwitchToGUI,
    onTriggerMatrix: (opts) => {
      setMatrixActive(true);
      setMatrixPersistent(opts?.persist === true);
      setMatrixRainbow(opts?.rainbow === true);
    },
    onDismissMatrix: () => {
      setMatrixActive(false);
      setMatrixPersistent(false);
      setMatrixRainbow(false);
    },
  });

  const [paletteOpen, setPaletteOpen] = useState(false);
  // Reverse-search state (fzf / bash Ctrl+R).
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  // Boot sequence: shown once per tab session. sessionStorage flag
  // short-circuits on reloads so only the very first mount plays it.
  const [bootDone, setBootDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (new URLSearchParams(window.location.search).has('skipBoot')) return true;
    return sessionStorage.getItem('tui-boot-shown') === '1';
  });
  // Idle matrix-rain screensaver: fires after 30s with no input.
  // `matrixPersistent` keeps the rain on across keypresses (`matrix on`)
  // until explicitly dismissed via `matrix off`. Default mode auto-
  // dismisses on user interaction.
  const [matrixActive, setMatrixActive] = useState(false);
  const [matrixPersistent, setMatrixPersistent] = useState(false);
  // Rainbow mode — flipped on by the `rainbow` command, cleared on
  // every dismiss + on Alt+M / chip toggle so plain matrix toggles
  // never inherit a stale rainbow state.
  const [matrixRainbow, setMatrixRainbow] = useState(false);

  // Persistent silent toggle for Alt+M / the matrix chip. We bypass
  // executeCommand entirely — no prompt echo, no scrollback line, no
  // history pollution — and pin it persistent so the next keypress
  // doesn't immediately dismiss it. The typed `matrix` / `matrix on`
  // / `matrix off` commands still go through the normal pathway.
  const toggleMatrix = useCallback(() => {
    setMatrixActive((wasActive) => {
      if (wasActive) {
        setMatrixPersistent(false);
        setMatrixRainbow(false);
        return false;
      }
      setMatrixPersistent(true);
      setMatrixRainbow(false);
      return true;
    });
  }, []);

  // Get current suggestions. Memoised so the array reference is stable
  // across renders that don't change `input` — without this, the
  // autocomplete effect would re-fire on every render (the arrow-key
  // bump → re-render path), wiping `selectedSuggestion` back to 0 and
  // breaking ↑/↓ navigation inside the dropdown.
  const suggestions = useMemo(
    () => getCommandSuggestions(input),
    [getCommandSuggestions, input],
  );

  // Update autocomplete visibility and reset selection when input changes.
  // Suppressed while browsing history with arrow keys — otherwise a recalled
  // command (e.g. "skills") opens the autocomplete, and the very next Up
  // goes into autocomplete navigation rather than continuing history recall.
  // Also suppressed when the only suggestion exactly matches the input —
  // a one-row dropdown showing what you already typed is just noise.
  useEffect(() => {
    const trimmed = input.trim();
    const isRedundant =
      suggestions.length === 1 && suggestions[0].toLowerCase() === trimmed.toLowerCase();
    if (!isBrowsingHistory && suggestions.length > 0 && trimmed && !isRedundant) {
      setShowAutocomplete(true);
      setSelectedSuggestion(0);
    } else {
      setShowAutocomplete(false);
      setSelectedSuggestion(0);
    }
  }, [input, suggestions, isBrowsingHistory]);

  // Measure the ghost span to position the blinking cursor precisely.
  // Runs before paint so the cursor never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (ghostRef.current) {
      setCursorLeft(ghostRef.current.offsetWidth);
    }
  }, [input]);

  // Close the autocomplete when the user clicks outside it.
  useEffect(() => {
    if (!showAutocomplete) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!autocompleteRef.current) return;
      if (autocompleteRef.current.contains(e.target as Node)) return;
      if (inputRef.current?.contains(e.target as Node)) return;
      setShowAutocomplete(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [showAutocomplete]);

  // Global keyboard shortcuts. Implemented at the window level so they
  // still fire when focus is on a link / button inside a Block.
  //
  // Letter shortcuts (t/g/m) use Alt as the modifier because bare
  // letters collide with typing commands — pressing `m` to trigger
  // matrix while the input is focused would eat the first letter of
  // `matrix` as a command name. Alt prevents that collision while
  // keeping the shortcut muscle-memory-friendly.
  //
  // Non-letter prefixes (?, /, :) are safe as bare keys because they
  // never start a TUI command word.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+K / Cmd+K — command palette toggle. Always fires.
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }

      // Ctrl+L — clear the terminal. Browser binding this to location
      // bar is why the input-level handler didn't fire reliably;
      // capturing here with preventDefault wins.
      if (mod && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        clearTerminal();
        return;
      }

      // Alt-letter shortcuts. Match by physical key code (e.code) not
      // produced character (e.key) — on macOS Alt is the Option key,
      // which mutates `e.key` to special chars (Alt+T → "†", Alt+G →
      // "©", Alt+M → "µ"). e.code === "KeyT" identifies the same
      // physical key regardless of the modifier-mutated character.
      if (e.altKey && !mod) {
        if (e.code === 'KeyT') {
          e.preventDefault();
          const current = getSavedTheme();
          const idx = colorThemes.findIndex((th) => th.key === current.key);
          const next = colorThemes[(idx + 1) % colorThemes.length];
          executeCommand(`theme ${next.key}`);
          return;
        }
        if (e.code === 'KeyG') {
          e.preventDefault();
          executeCommand('gui');
          return;
        }
        if (e.code === 'KeyM') {
          e.preventDefault();
          toggleMatrix();
          return;
        }
      }

      // Non-letter bare-key prefixes. These previously hijacked the
      // input regardless of state, which broke things like typing
      // `rm -rf` then `/` (suddenly the input became `search `).
      // Now we only intercept when the input is empty — at that point
      // the user clearly isn't typing a command, so the shortcut wins.
      // While typing a command, these keys reach the input naturally
      // (`/` is a valid character in arguments).
      if (!mod && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable;
        const inputEmpty = !input;
        if (e.key === '?') {
          if (!isEditable || inputEmpty) {
            e.preventDefault();
            executeCommand('help');
            return;
          }
        }
        if (e.key === '/') {
          if (!isEditable || inputEmpty) {
            e.preventDefault();
            inputRef.current?.focus();
            setInput('search ');
            return;
          }
        }
        if (e.key === ':') {
          if (!isEditable || inputEmpty) {
            e.preventDefault();
            inputRef.current?.focus();
            setInput(':');
            return;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearTerminal, executeCommand, input, toggleMatrix]);

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    // Focus immediately without setTimeout
    inputRef.current?.focus();
    
    // Also focus when the component mounts and data loads
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    // Set focus after a brief moment to ensure DOM is ready
    const timer = requestAnimationFrame(focusInput);
    
    return () => cancelAnimationFrame(timer);
  }, []);

  // Additional effect to focus when portfolio data loads
  useEffect(() => {
    if (portfolioData && inputRef.current) {
      inputRef.current.focus();
    }
  }, [portfolioData]);

  // Anchor newly-run commands to the top of the viewport instead of
  // yanking to the bottom. User lands on the command they typed + the
  // start of its output, and scrolls through the rest at their own
  // pace. Fires once per command (keyed on isCommand line id), so
  // mid-command addLine/addNode calls don't re-scroll.
  useEffect(() => {
    if (!terminalRef.current) return;
    let lastCmd: typeof lines[number] | undefined;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].isCommand) {
        lastCmd = lines[i];
        break;
      }
    }
    if (!lastCmd || lastCmd.id === lastAnchoredCommandId.current) return;
    const el = terminalRef.current.querySelector<HTMLElement>(
      `[data-line-id="${CSS.escape(lastCmd.id)}"]`,
    );
    if (el) {
      el.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
    lastAnchoredCommandId.current = lastCmd.id;
  }, [lines, prefersReducedMotion]);

  // Handle URL command execution (for PWA shortcuts). Waits for the
  // boot sequence to finish — bootDone flips true after the CRT
  // animation, so the welcome / deep-link runs against the rendered
  // Block chrome rather than behind the boot overlay.
  useEffect(() => {
    if (isLoading || !portfolioData || welcomeMessageShown.current) {
      return; // Wait for data, and only run once
    }
    if (!bootDone) return; // Wait for boot sequence to finish

    if (urlCommand) {
      // If a command is in the URL, execute it and skip the welcome message
      executeCommand(urlCommand);
      clearCommand();
    } else {
      // Otherwise, show the default welcome message
      showWelcomeMessage();
    }

    welcomeMessageShown.current = true; // Mark as shown
  }, [urlCommand, isLoading, portfolioData, executeCommand, clearCommand, showWelcomeMessage, bootDone]);

  // Idle matrix rain:
  //   - After 30s of no activity the screensaver activates.
  //   - Deliberate user input WHILE ACTIVE dismisses it. We split
  //     "dismissal" (keydown / pointerdown / wheel / touchstart) from
  //     "idle reset" (those + pointermove). pointermove resets the
  //     idle clock but does NOT dismiss — otherwise reading the screen
  //     while your mouse drifts a pixel kills the rain.
  //   - There's a 350ms grace period after activation during which
  //     dismissal is ignored. This stops the very keydown that
  //     triggered `matrix` (the Enter key) from immediately dismissing
  //     it via the window-level listener firing later in the same
  //     event dispatch.
  //   - The `matrix` command manually triggers via onTriggerMatrix.
  const matrixActiveRef = useRef(false);
  matrixActiveRef.current = matrixActive;
  const matrixPersistentRef = useRef(false);
  matrixPersistentRef.current = matrixPersistent;
  const matrixActivatedAt = useRef(0);
  useEffect(() => {
    if (matrixActive) matrixActivatedAt.current = Date.now();
  }, [matrixActive]);
  useEffect(() => {
    const IDLE_MS = 30_000;
    const GRACE_MS = 350;
    let t: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(t);
      t = setTimeout(() => setMatrixActive(true), IDLE_MS);
    };
    const dismiss = () => {
      if (matrixPersistentRef.current) return; // `matrix on` mode — keep rain alive
      if (matrixActiveRef.current && Date.now() - matrixActivatedAt.current > GRACE_MS) {
        setMatrixActive(false);
      }
    };
    resetTimer();
    const idleEvts: (keyof WindowEventMap)[] = [
      'keydown',
      'pointerdown',
      'pointermove',
      'wheel',
      'touchstart',
    ];
    const dismissEvts: (keyof WindowEventMap)[] = [
      'keydown',
      'pointerdown',
      'wheel',
      'touchstart',
    ];
    idleEvts.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    dismissEvts.forEach((e) => window.addEventListener(e, dismiss, { passive: true }));
    return () => {
      clearTimeout(t);
      idleEvts.forEach((e) => window.removeEventListener(e, resetTimer));
      dismissEvts.forEach((e) => window.removeEventListener(e, dismiss));
    };
  }, []);

  // Handle offline/online status
  useEffect(() => {
    const handleOffline = () => {
      executeCommand('echo "[offline] some features unavailable."');
    };

    const handleOnline = () => {
      executeCommand('echo "[online] connection restored."');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [executeCommand]);

  // Reverse-search: all history entries matching the query, newest
  // first. An empty query yields every history entry.
  const searchMatches = searchMode
    ? recentCommands.filter((cmd) =>
        searchQuery === '' || cmd.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];
  const activeSearchMatch =
    searchMatches[Math.min(searchMatchIndex, Math.max(0, searchMatches.length - 1))];

  const exitSearchMode = useCallback((commit?: string | null) => {
    setSearchMode(false);
    setSearchQuery('');
    setSearchMatchIndex(0);
    if (commit !== undefined && commit !== null) setInput(commit);
    inputRef.current?.focus();
  }, []);

  // Handle keydown events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Reverse-search mode absorbs every key — enter/exit are the only
    // transitions back to normal terminal behaviour.
    if (searchMode) {
      if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
        e.preventDefault();
        exitSearchMode('');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSearchMatch) {
          exitSearchMode(null);
          setInput('');
          executeCommand(activeSearchMatch);
        } else {
          exitSearchMode('');
        }
        return;
      }
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        // Cycle to the next older match.
        setSearchMatchIndex((i) =>
          searchMatches.length > 0 ? (i + 1) % searchMatches.length : 0,
        );
        return;
      }
      if (e.key === 'Tab') {
        // Commit the match as the current input for editing.
        e.preventDefault();
        exitSearchMode(activeSearchMatch ?? '');
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setSearchQuery((q) => q.slice(0, -1));
        setSearchMatchIndex(0);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchQuery((q) => q + e.key);
        setSearchMatchIndex(0);
        return;
      }
      // Block arrow keys, etc. while searching.
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        return;
      }
      return;
    }

    // Ctrl+R enters reverse-search (from normal / autocomplete mode).
    if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      setSearchMode(true);
      setSearchQuery(input); // seed with whatever they were typing
      setSearchMatchIndex(0);
      setShowAutocomplete(false);
      return;
    }

    // Handle autocomplete navigation
    if (showAutocomplete && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestion(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          return;
        case 'Tab':
        case 'Enter':
          if (e.key === 'Tab' || (e.key === 'Enter' && selectedSuggestion >= 0)) {
            e.preventDefault();
            const picked = suggestions[selectedSuggestion];
            setInput(picked);
            setShowAutocomplete(false);
            if (e.key === 'Enter') {
              executeCommand(picked);
              setInput('');
            }
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowAutocomplete(false);
          return;
      }
    }

    // Handle normal terminal commands
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (input.trim()) {
          // `o N` / `g N` / `open N` are handled as first-class commands
          // inside useTerminal's executeCommand — they route through the
          // link registry there, so history + prompt echo + exit codes
          // all behave normally.
          executeCommand(input);
          setInput('');
        }
        setShowAutocomplete(false);
        break;
      case 'ArrowUp':
        if (!showAutocomplete) {
          e.preventDefault();
          setInput(navigateHistory('up'));
        }
        break;
      case 'ArrowDown':
        if (!showAutocomplete) {
          e.preventDefault();  
          setInput(navigateHistory('down'));
        }
        break;
      case 'Tab':
        if (!showAutocomplete) {
          e.preventDefault();
          const tabSuggestions = getCommandSuggestions(input);
          if (tabSuggestions.length === 1) {
            setInput(tabSuggestions[0]);
          }
        }
        break;
      case 'c':
        if (e.ctrlKey) {
          e.preventDefault();
          setInput('');
          setShowAutocomplete(false);
        }
        break;
      case 'l':
        if (e.ctrlKey) {
          e.preventDefault();
          clearTerminal();
          setShowAutocomplete(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        break;
    }
  };

  // Handle terminal click to focus input - click anywhere on terminal
  const handleTerminalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Don't focus if user is selecting text
    if (window.getSelection()?.toString()) {
      return;
    }

    // Traverse up looking for an interactive element; if we find one,
    // let the browser handle its click and skip focusing the input.
    let currentElement: HTMLElement | null = target;
    while (currentElement && currentElement !== e.currentTarget) {
      if (
        currentElement.tagName === 'A' ||
        currentElement.tagName === 'BUTTON' ||
        currentElement.tagName === 'INPUT' ||
        currentElement.tagName === 'TEXTAREA'
      ) {
        return;
      }
      currentElement = currentElement.parentElement;
    }

    inputRef.current?.focus();
  };

  // Render loading or error states
  if (isLoading) {
    return (
      <div className="terminal-glow terminal-scanlines relative w-full h-dvh bg-terminal-black">
        <div className="flex items-center justify-center h-full">
          <div className="text-terminal-green">
            <div className="mb-4">{uiText.loading.text}</div>
            <div className="text-terminal-bright-green animate-pulse">████████████████</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-glow terminal-scanlines relative w-full h-dvh bg-terminal-black">
        <div className="flex items-center justify-center h-full">
          <div className="text-terminal-red">
            <div className="mb-4">{uiText.loading.error}:</div>
            <div className="text-white">{error.message}</div>
            <div className="mt-4 text-terminal-yellow">Please refresh the page to try again.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // h-dvh so the layout shrinks with the visual viewport when the
    // mobile soft keyboard opens — h-screen (100vh) is fixed to the
    // page height and lets the keyboard cover the input + status bar.
    <div className="terminal-glow terminal-scanlines relative w-full h-dvh bg-terminal-black">
      {/* Shared film-grain atmosphere — also used by the GUI so both
           views share one noise floor. Paused on reduced-motion. */}
      <div className="film-grain" aria-hidden="true" />
      {/* Idle matrix-rain screensaver — positioned on the outer shell
           (not the scrolling output pane) so it overlays the full
           terminal viewport regardless of scroll position. */}
      <IdleMatrixRain active={matrixActive} rainbow={matrixRainbow} />
      <div className="flex flex-col h-full">
        {/* Terminal Header — traffic-light dots keep the retro chrome,
             and the path segment now reflects the Starship-style dir. */}
        <div className="border-b border-tui-accent-dim/30 p-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex space-x-1" aria-hidden="true">
              <div className="w-3 h-3 rounded-full bg-tui-error"></div>
              <div className="w-3 h-3 rounded-full bg-tui-warn"></div>
              <div className="w-3 h-3 rounded-full bg-terminal-green"></div>
            </div>
            <span className="text-xs sm:text-sm truncate font-mono text-tui-accent-dim">
              {promptUser}@{promptHost}:{currentDir}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            {isInstalled && <span className="hidden sm:block font-mono">pwa</span>}
            {isInstallable && (
              <button
                onClick={installApp}
                className="text-tui-accent-dim hover:text-terminal-bright-green transition-colors px-2 py-1 min-h-[36px] flex items-center justify-center text-xs font-mono border border-tui-accent-dim/40 hover:border-terminal-bright-green"
                title="install app"
                aria-label="install app as pwa"
              >
                [install]
              </button>
            )}
            <span className="hidden sm:block font-mono">terminal portfolio v2.0</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          role="log"
          aria-label="Terminal output"
          aria-live="polite"
          aria-atomic="false"
          className="flex-1 p-2 sm:p-4 overflow-y-auto scrollbar-terminal cursor-text relative"
          onClick={handleTerminalClick}
        >
          {/* CRT boot sequence — plays once per session before welcome. */}
          {!bootDone && (
            <BootSequence
              themeName={getSavedTheme().name.toLowerCase()}
              onComplete={() => {
                setBootDone(true);
                try {
                  sessionStorage.setItem('tui-boot-shown', '1');
                } catch {
                  // ignore storage errors
                }
              }}
            />
          )}
          {/* Command Output. TerminalLinkProvider is scoped to this
              subtree so every NumberedLink inside any Block registers
              with the same terminal-wide numbering sequence. */}
          <TerminalLinkProvider value={linkRegistry}>
            <div className="space-y-1 text-sm sm:text-base">
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  data-line-id={line.id}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`${line.className || 'text-terminal-green'} break-words overflow-x-auto leading-relaxed`}
                >
                  {line.content}
                </motion.div>
              ))}
            </div>
          </TerminalLinkProvider>
        </div>

        {/* Command Input — Starship-style prompt. Exit status is a
            single inline ✔/✖ glyph between the path and the `$`, so
            we don't need a dedicated row above. Theme name is shown
            once in the StatusBar instead of duplicated here. Inner
            content is capped to max-w-4xl to align with Block output
            on wide monitors; the outer border-t still spans edge-to-edge. */}
        <div className="border-t border-terminal-green/30 px-2 sm:px-4 py-1.5 sm:py-2">
          <div className="max-w-4xl">
          <div className="flex items-center font-mono">
            {searchMode ? (
              <span className="flex-shrink-0 text-sm sm:text-base whitespace-nowrap">
                <span className="text-tui-accent-dim">(reverse-i-search)</span>
                <span className="text-tui-muted">`</span>
                <span className="text-terminal-bright-green">{searchQuery}</span>
                <span className="text-tui-muted">'</span>
                <span className="text-terminal-green">: </span>
              </span>
            ) : (
              <span className="flex-shrink-0 text-sm sm:text-base whitespace-nowrap">
                <span className="text-tui-accent-dim">{promptUser}</span>
                <span className="text-tui-muted">@{promptHost}</span>
                <span className="text-terminal-bright-green"> {currentDir}</span>
                {lastExitCode !== null && (
                  lastExitCode === 0 ? (
                    <span className="text-terminal-bright-green"> ✔</span>
                  ) : (
                    <span className="text-tui-error"> ✖</span>
                  )
                )}
                <span className="text-terminal-green"> $ </span>
              </span>
            )}
            <div className="flex-1 relative min-w-0 ml-1.5 sm:ml-2">
              <input
                ref={inputRef}
                type="text"
                value={searchMode ? (activeSearchMatch ?? '') : input}
                readOnly={searchMode}
                onChange={(e) => {
                  if (searchMode) return; // all typing is handled via keydown
                  setInput(e.target.value);
                  if (!hasTyped && e.target.value.length > 0) {
                    setHasTyped(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-terminal-green outline-none font-mono text-sm sm:text-base"
                autoComplete="off"
                spellCheck="false"
                placeholder={!hasTyped && !searchMode ? uiText.input.placeholder : ""}
              />
              {/* Ghost span — invisible mirror of the input text. Its
                  offsetWidth is what we measure to position the cursor. */}
              <span
                ref={ghostRef}
                aria-hidden="true"
                className="invisible absolute top-0 left-0 whitespace-pre font-mono text-sm sm:text-base pointer-events-none"
              >
                {input}
              </span>
              <span
                className="absolute text-terminal-green blink text-sm sm:text-base"
                style={{ left: `${cursorLeft}px`, top: '50%', transform: 'translateY(-45%)' }}
              >
                █
              </span>
              
              {/* Reverse-search hints live in the StatusBar (mode='search')
                  so they don't pop in as a third row above the chip
                  strip. See StatusBar.tsx for the swap. */}

              {/* Autocomplete Dropdown */}
              {showAutocomplete && suggestions.length > 0 && (
                <div
                  ref={autocompleteRef}
                  role="listbox"
                  aria-label="Command suggestions"
                  className="absolute bottom-full left-0 mb-1 bg-terminal-black border border-terminal-green/50 rounded-sm shadow-lg terminal-glow z-10 min-w-full max-w-xs"
                >
                  <div className="py-1">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        role="option"
                        aria-selected={index === selectedSuggestion}
                        className={`px-3 py-1 text-sm sm:text-base cursor-pointer border border-transparent rounded-sm transition-all duration-150 ease-in-out ${
                          index === selectedSuggestion
                            // Selected state — theme-reactive glow via --glow-color-rgb,
                            // so a Glacier theme pops in cool-white and a Pink theme
                            // pops in magenta. No more hardcoded CRT green.
                            ? 'border-terminal-green text-terminal-bright-green shadow-[0_0_10px_rgba(var(--glow-color-rgb),0.55)]'
                            : 'text-terminal-green hover:bg-terminal-green/10'
                        }`}
                        onClick={() => {
                          setInput(suggestion);
                          setShowAutocomplete(false);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-terminal-green/30 px-3 py-1">
                    <div className="text-xs text-terminal-green/60" role="status" aria-live="polite">
                      ↑↓ navigate • Tab/Enter select • Esc close
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Persistent keyboard-hint status bar (lazygit / k9s / Ghostty).
            Each chip is also tappable — fires the same action a
            keyboard shortcut would. On touch devices the modifier
            chips hide entirely (they have no Ctrl/Alt counterpart),
            but the bare-key chips (?, /, :) still tap to act. */}
        <StatusBar
          themeName={getSavedTheme().name.toLowerCase()}
          blockCount={lines.filter((l) => l.isCommand).length}
          historyCount={historyLength}
          mode={searchMode ? 'search' : paletteOpen ? 'palette' : 'insert'}
          searchInfo={
            searchMode
              ? { matchIndex: searchMatchIndex, matchCount: searchMatches.length }
              : undefined
          }
          actions={{
            help: () => executeCommand('help'),
            search: () => {
              inputRef.current?.focus();
              setInput('search ');
            },
            cmd: () => {
              inputRef.current?.focus();
              setInput(':');
            },
            recall: () => {
              setSearchMode(true);
              setSearchQuery(input);
              setSearchMatchIndex(0);
              setShowAutocomplete(false);
              inputRef.current?.focus();
            },
            palette: () => setPaletteOpen((p) => !p),
            cycleTheme: () => {
              const current = getSavedTheme();
              const idx = colorThemes.findIndex((th) => th.key === current.key);
              const next = colorThemes[(idx + 1) % colorThemes.length];
              executeCommand(`theme ${next.key}`);
            },
            toGui: () => executeCommand('gui'),
            // Same toggle as Alt+M — silent (no echo), persistent
            // (doesn't auto-dismiss on next keypress).
            matrix: toggleMatrix,
            clear: () => clearTerminal(),
            // Search-mode chip taps — let touch users drive the
            // reverse-search the same way desktop users drive it
            // with Ctrl+R / Enter / Tab / Esc.
            searchNext: () => {
              setSearchMatchIndex((i) =>
                searchMatches.length > 0 ? (i + 1) % searchMatches.length : 0,
              );
            },
            searchRun: () => {
              if (activeSearchMatch) {
                exitSearchMode(null);
                setInput('');
                executeCommand(activeSearchMatch);
              } else {
                exitSearchMode('');
              }
            },
            searchEdit: () => exitSearchMode(activeSearchMatch ?? ''),
            searchCancel: () => exitSearchMode(''),
          }}
        />
      </div>

      {/* Warp-style command palette — Ctrl+K / Cmd+K */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={getCommandMetadata()}
        recentCommands={recentCommands}
        onExecute={executeCommand}
      />
    </div>
  );
}

// Export memoized Terminal component for better performance
export default memo(Terminal);
