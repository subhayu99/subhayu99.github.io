import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTerminal } from '@/hooks/useTerminal';
import { loadPortfolioData } from '@/lib/yamlParser';
import { enhanceContent, getLinkUrl } from '@/lib/linkRenderer';

export default function Terminal() {
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Load portfolio data
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['/api/portfolio'],
    queryFn: loadPortfolioData,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    lines,
    executeCommand,
    navigateHistory,
    getCommandSuggestions,
    getAllCommands,
    clearTerminal
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
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

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
                setShowWelcome(false);
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
          setShowWelcome(false);
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
          setShowWelcome(false);
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
    
    // Handle links with data-link attribute
    if (target.dataset.link) {
      e.preventDefault();
      e.stopPropagation();
      
      const url = getLinkUrl(target.dataset.link);
      if (url) {
        if (url.startsWith('mailto:')) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      }
      return;
    }
    
    // Don't focus if user is selecting text or clicking on other links
    if (window.getSelection()?.toString() || target.tagName === 'A') {
      return;
    }
    
    inputRef.current?.focus();
  };

  // Render loading or error states
  if (isLoading) {
    return (
      <div className="terminal-glow terminal-scanlines relative w-full h-screen bg-terminal-black">
        <div className="flex items-center justify-center h-full">
          <div className="text-terminal-green">
            <div className="mb-4">Loading portfolio data...</div>
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
            <div className="mb-4">Error loading portfolio data:</div>
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
            <span className="text-xs sm:text-sm truncate">subhayu@portfolio:~$</span>
          </div>
          <div className="text-xs opacity-60 hidden sm:block">Terminal Portfolio v2.0</div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 p-2 sm:p-4 overflow-y-auto scrollbar-terminal cursor-text"
          onClick={handleTerminalClick}
        >
          {/* Welcome Screen */}
          {showWelcome && (
            <div className="mb-4 sm:mb-6">
              <div className="mb-3 sm:mb-4">
                <pre className="text-terminal-bright-green text-xs leading-tight overflow-x-auto hidden sm:block">
{` ____        _     _                         _   __                           
/  ___|      | |   | |                       | | / /                           
\\ \`--. _   _| |__ | |__   __ _ _   _ _   _   | |/ / _   _ _ __ ___   __ _ _ __  
 \`--. \\| | | | '_ \\| '_ \\ / _\` | | | | | | |  |    \\| | | | '_ \` _ \\ / _\` | '__| 
/\\__/ /| |_| | |_) | | | | (_| | |_| | |_| |  | |\\  \\ |_| | | | | | | (_| | |    
\\____/  \\__,_|_.__/|_| |_|\\__,_|\\__, |\\__,_|  \\_| \\_/\\__,_|_| |_| |_|\\__,_|_|    
                                 __/ |                                           
                                |___/`}
                </pre>
                {/* Mobile version - simplified ASCII */}
                <div className="sm:hidden text-terminal-bright-green text-center mb-3">
                  <div className="text-lg font-bold">SUBHAYU KUMAR BALA</div>
                  <div className="text-sm">TERMINAL PORTFOLIO</div>
                </div>
              </div>
              <div className="mb-4 sm:mb-6">
                <p className="text-terminal-green mb-2 text-sm sm:text-base">Welcome to my terminal portfolio!</p>
                <p className="text-white/80 mb-2 text-xs sm:text-sm leading-relaxed">
                  {portfolioData ? 
                    "Data & Infrastructure Engineer | AI/LLM Specialist | 3+ Years Experience" :
                    "Loading professional information..."
                  }
                </p>
                <p className="text-terminal-bright-green mb-4 text-xs sm:text-sm">
                  Type '<span className="font-bold">help</span>' to see available commands or explore with tab completion.
                </p>
              </div>
            </div>
          )}

          {/* Command Output */}
          <div className="space-y-1 text-xs sm:text-sm lg:text-base">
            {lines.map((line) => (
              <div 
                key={line.id} 
                className={`${line.className || 'text-terminal-green'} break-words overflow-x-auto leading-relaxed`}
                dangerouslySetInnerHTML={{ __html: enhanceContent(line.content) }}
              />
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="border-t border-terminal-green/30 p-2 sm:p-4">
          <div className="flex items-center">
            <span className="text-terminal-bright-green mr-1 sm:mr-2 text-xs sm:text-sm flex-shrink-0">subhayu@portfolio:~$</span>
            <div className="flex-1 relative min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-terminal-green outline-none font-mono text-xs sm:text-sm"
                autoComplete="off"
                spellCheck="false"
                placeholder=""
              />
              <span className="absolute text-terminal-green blink ml-1 text-xs sm:text-sm" style={{ left: `${input.length * 0.5}em` }}>
                █
              </span>
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 bg-terminal-black border border-terminal-green/50 rounded-sm shadow-lg terminal-glow z-10 min-w-full max-w-xs">
                  <div className="py-1">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`px-3 py-1 text-xs sm:text-sm cursor-pointer transition-colors ${
                          index === selectedSuggestion
                            ? 'bg-terminal-green/20 text-terminal-bright-green'
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
                    <div className="text-xs text-terminal-green/60">
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
