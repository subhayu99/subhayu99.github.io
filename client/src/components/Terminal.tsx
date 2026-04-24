import { useState, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTerminal } from '../hooks/useTerminal';
import { loadPortfolioData } from '../lib/portfolioDataLoader';
import { usePWA, useURLCommand } from '../hooks/usePWA';
import { uiText, apiConfig, getSavedTheme } from '../config';
import { StatusBar } from './tui/StatusBar';
import { CommandPalette } from './tui/CommandPalette';
import { TerminalLinkProvider } from './tui/LinkRegistry';

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
  } = useTerminal({ portfolioData: portfolioData || null, onSwitchToGUI });

  const [paletteOpen, setPaletteOpen] = useState(false);

  // Get current suggestions
  const suggestions = getCommandSuggestions(input);

  // Update autocomplete visibility and reset selection when input changes.
  // Suppressed while browsing history with arrow keys — otherwise a recalled
  // command (e.g. "skills") opens the autocomplete, and the very next Up
  // goes into autocomplete navigation rather than continuing history recall.
  useEffect(() => {
    if (!isBrowsingHistory && suggestions.length > 0 && input.trim()) {
      setShowAutocomplete(true);
      setSelectedSuggestion(0);
    } else {
      setShowAutocomplete(false);
      setSelectedSuggestion(0);
    }
  }, [input, suggestions.length, isBrowsingHistory]);

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

  // Ctrl+K / Cmd+K opens the command palette from anywhere in the TUI.
  // Captured at the window level so it works when focus is in a link
  // or a button inside a Block output.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Handle URL command execution (for PWA shortcuts)
  useEffect(() => {
    if (isLoading || !portfolioData || welcomeMessageShown.current) {
      return; // Wait for data, and only run once
    }

    if (urlCommand) {
      // If a command is in the URL, execute it and skip the welcome message
      executeCommand(urlCommand);
      clearCommand();
    } else {
      // Otherwise, show the default welcome message
      showWelcomeMessage();
    }

    welcomeMessageShown.current = true; // Mark as shown
  }, [urlCommand, isLoading, portfolioData, executeCommand, clearCommand, showWelcomeMessage]);

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

  // Handle keydown events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          // Vim-motion link open: `o N` / `g N` / `open N` routes to
          // the numbered-link registry, not to executeCommand. Falls
          // through to executeCommand when the input doesn't match.
          const openMatch = input.trim().match(/^(?:o|g|open)\s+(\d+)$/i);
          if (openMatch) {
            const n = parseInt(openMatch[1], 10);
            const link = linkRegistry.resolve(n);
            if (link) {
              window.open(link.href, '_blank', 'noopener,noreferrer');
            } else {
              executeCommand(`echo "no link #${n} in view"`);
            }
            setInput('');
            setShowAutocomplete(false);
            break;
          }
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
      <div className="terminal-glow terminal-scanlines relative w-full h-screen bg-terminal-black">
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
      <div className="terminal-glow terminal-scanlines relative w-full h-screen bg-terminal-black">
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
    <div className="terminal-glow terminal-scanlines relative w-full h-screen bg-terminal-black">
      <div className="flex flex-col h-full">
        {/* Terminal Header */}
        <div className="border-b border-terminal-green/30 p-2 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-terminal-red"></div>
              <div className="w-3 h-3 rounded-full bg-terminal-yellow"></div>
              <div className="w-3 h-3 rounded-full bg-terminal-green"></div>
            </div>
            <span className="text-xs sm:text-sm truncate">~/portfolio</span>
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
          className="flex-1 p-2 sm:p-4 overflow-y-auto scrollbar-terminal cursor-text"
          onClick={handleTerminalClick}
        >

          {/* Command Output. TerminalLinkProvider is scoped to this
              subtree so every NumberedLink inside any Block registers
              with the same terminal-wide numbering sequence. */}
          <TerminalLinkProvider value={linkRegistry}>
            <div className="space-y-1 text-xs sm:text-sm lg:text-base">
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

        {/* Command Input — Starship-style prompt with right-aligned
            exit-status + theme name. Dir changes with navigation commands. */}
        <div className="border-t border-terminal-green/30 p-2 sm:p-4">
          {/* Right prompt: subtle, only shown when something to say */}
          <div className="flex items-center justify-end mb-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums text-tui-muted h-3 sm:h-4">
            {lastExitCode !== null && (
              <span className="mr-3">
                {lastExitCode === 0 ? (
                  <span className="text-terminal-bright-green">✔</span>
                ) : (
                  <span className="text-tui-error">✖ {lastExitCode}</span>
                )}
              </span>
            )}
            <span>{getSavedTheme().name.toLowerCase()}</span>
          </div>
          <div className="flex items-center font-mono">
            <span className="flex-shrink-0 text-xs sm:text-sm whitespace-nowrap">
              <span className="text-tui-accent-dim">{promptUser}</span>
              <span className="text-tui-muted">@{promptHost}</span>
              <span className="text-terminal-bright-green"> {currentDir}</span>
              <span className="text-terminal-green"> $ </span>
            </span>
            <div className="flex-1 relative min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (!hasTyped && e.target.value.length > 0) {
                    setHasTyped(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-terminal-green outline-none font-mono text-xs sm:text-sm"
                autoComplete="off"
                spellCheck="false"
                placeholder={!hasTyped ? uiText.input.placeholder : ""}
              />
              {/* Ghost span — invisible mirror of the input text. Its
                  offsetWidth is what we measure to position the cursor. */}
              <span
                ref={ghostRef}
                aria-hidden="true"
                className="invisible absolute top-0 left-0 whitespace-pre font-mono text-xs sm:text-sm pointer-events-none"
              >
                {input}
              </span>
              <span
                className="absolute text-terminal-green blink text-xs sm:text-sm"
                style={{ left: `${cursorLeft}px`, top: '50%', transform: 'translateY(-45%)' }}
              >
                █
              </span>
              
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
                        className={`px-3 py-1 text-xs sm:text-sm cursor-pointer border border-transparent rounded-sm transition-all duration-150 ease-in-out ${
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

        {/* Persistent keyboard-hint status bar (lazygit / k9s / Ghostty) */}
        <StatusBar
          themeName={getSavedTheme().name.toLowerCase()}
          blockCount={lines.filter((l) => l.isCommand).length}
          historyCount={historyLength}
          mode={paletteOpen ? 'palette' : 'insert'}
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
