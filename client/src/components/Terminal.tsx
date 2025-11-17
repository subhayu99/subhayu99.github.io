import { useState, useRef, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { useTerminal } from '../hooks/useTerminal';
import { loadPortfolioData } from '../lib/portfolioDataLoader';
import { enhanceContent, getLinkUrl } from '../lib/linkRenderer';
import { usePWA, useURLCommand } from '../hooks/usePWA';
import { getPromptString, uiText, apiConfig } from '../config';

function Terminal() {
  const [hasTyped, setHasTyped] = useState(false);
  const [input, setInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const welcomeMessageShown = useRef(false);

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
    getCommandSuggestions,
    getAllCommands,
    clearTerminal,
    showWelcomeMessage,
  } = useTerminal({ portfolioData: portfolioData || null });

  // Get current suggestions
  const suggestions = getCommandSuggestions(input);

  // Update autocomplete visibility and reset selection when input changes
  useEffect(() => {
    if (suggestions.length > 0 && input.trim()) {
      setShowAutocomplete(true);
      setSelectedSuggestion(0);
    } else {
      setShowAutocomplete(false);
      setSelectedSuggestion(0);
    }
  }, [input, suggestions.length]);

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

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

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
      executeCommand('echo "⚠️  You are offline. Some features may be unavailable."');
    };

    const handleOnline = () => {
      executeCommand('echo "✅ You are back online!"');
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
            setInput(suggestions[selectedSuggestion]);
            setShowAutocomplete(false);
            if (e.key === 'Enter') {
              setTimeout(() => {
                executeCommand(suggestions[selectedSuggestion]);
                setInput('');
              }, 50);
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

    // Traverse up from the clicked element to find an interactive element
    let currentElement: HTMLElement | null = target;
    while (currentElement && currentElement !== e.currentTarget) {
      // Handle custom data-link links
      if (currentElement.dataset.link) {
        e.preventDefault();
        e.stopPropagation();
        const url = getLinkUrl(currentElement.dataset.link);
        if (url) {
          if (url.startsWith('mailto:')) {
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
        }
        return; // Link handled, do not focus input
      }

      // Check for standard interactive elements or elements with inline JS handlers
      if (
        currentElement.tagName === 'A' ||
        currentElement.tagName === 'BUTTON' ||
        currentElement.hasAttribute('onclick')
      ) {
        // This is an interactive element (like a link or collapsible).
        // Let the browser handle the click and do not focus the terminal input.
        return;
      }

      currentElement = currentElement.parentElement;
    }

    // If no interactive element was found in the ancestry, focus the input.
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
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-terminal-red"></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-terminal-yellow"></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-terminal-green"></div>
            </div>
            <span className="text-xs sm:text-sm truncate">~/portfolio</span>
          </div>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            {isInstalled && <span className="hidden sm:block">PWA</span>}
            {isInstallable && (
              <button
                onClick={installApp}
                className="text-terminal-green hover:text-terminal-bright-green transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Install app"
                aria-label="Install app as PWA"
              >
                📱
              </button>
            )}
            <span className="hidden sm:block">Terminal Portfolio v2.0</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 p-2 sm:p-4 overflow-y-auto scrollbar-terminal cursor-text"
          onClick={handleTerminalClick}
        >

          {/* Command Output */}
          <div className="space-y-1 text-xs sm:text-sm lg:text-base">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`${line.className || 'text-terminal-green'} break-words overflow-x-auto leading-relaxed`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(enhanceContent(line.content), {
                    ADD_ATTR: ["onclick"],
                  }),
                }}
              />
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="border-t border-terminal-green/30 p-2 sm:p-4">
          <div className="flex items-center">
            <span className="text-terminal-bright-green mr-1 sm:mr-2 text-xs sm:text-sm flex-shrink-0">{getPromptString()}</span>
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
              <span className="absolute text-terminal-green blink text-xs sm:text-sm" style={{ left: `${input.length * 0.6}em`, top: '50%', transform: 'translateY(-45%)' }}>
                █
              </span>
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && suggestions.length > 0 && (
                <div
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
                            ? 'border-terminal-green text-terminal-bright-green shadow-[0_0_8px_rgba(55,255,135,0.5)]' // Enhanced selected state
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
    </div>
  );
}

// Export memoized Terminal component for better performance
export default memo(Terminal);
