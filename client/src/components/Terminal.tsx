import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTerminal } from '../hooks/useTerminal';
import { loadPortfolioData } from '../lib/yamlParser';
import { enhanceContent, getLinkUrl } from '../lib/linkRenderer';
import { usePWA, useURLCommand } from '../hooks/usePWA';

export default function Terminal() {
  const [hasTyped, setHasTyped] = useState(false);
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // PWA functionality
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { urlCommand, clearCommand } = useURLCommand();

  // Load portfolio data
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['portfolio-data'],
    queryFn: loadPortfolioData,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const sanitizedPhone = portfolioData?.cv.phone.replace(/[^\d+]/g, '');

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
    if (urlCommand && !isLoading && portfolioData) {
      executeCommand(urlCommand);
      clearCommand();
      setShowWelcome(false);
    }
  }, [urlCommand, isLoading, portfolioData, executeCommand, clearCommand]);

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
            <span className="text-xs sm:text-sm truncate">~/portfolio</span>
          </div>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            {isInstalled && <span className="hidden sm:block">PWA</span>}
            {isInstallable && (
              <button 
                onClick={installApp}
                className="text-terminal-green hover:text-terminal-bright-green transition-colors"
                title="Install app"
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
          {/* Welcome Screen */}
          {showWelcome && portfolioData && (
            <div className="mb-4 sm:mb-6">
              {/* ASCII Art Header */}
              <div className="mb-3 sm:mb-4">
                <pre className="text-terminal-bright-green text-xs leading-tight overflow-x-auto hidden sm:block">
{` ___      _    _                     _  __                     ___       _      
/ __|_  _| |__| |_  __ _ _  _ _  _  | |/ /  _ _ __  __ _ _ _  | _ ) __ _| |__ _ 
\\__ \\ || | '_ \\ ' \\/ _\` | || | || | | ' < || | '  \\/ _\` | '_| | _ \\/ _\` | / _\` |
|___/\\_,_|_.__/_||_\\__,_|\\_, |\\_,_| |_|\\_\\_,_|_|_|_\\__,_|_|   |___/\\__,_|_\\__,_|
                         |__/                                                   `}
                </pre>
                <div className="sm:hidden text-terminal-bright-green text-center mb-3">
                  <div className="text-lg font-bold">{portfolioData.cv.name.toUpperCase()}</div>
                  <div className="text-sm">TERMINAL PORTFOLIO</div>
                </div>
              </div>

              {/* Main Introduction */}
              <div className="mb-4">
                <p className="text-terminal-green mb-2 text-sm sm:text-base">Welcome to my portfolio!</p>
                <p className="text-white/80 mb-2 text-xs sm:text-sm leading-relaxed">
                  {portfolioData ? 
                    `${portfolioData.cv.sections.intro[0]}` : "Loading professional information..."
                  }
                </p>
              </div>

              {/* Quick Overview Box */}
              <div className="border border-terminal-green/50 rounded-sm mb-4 terminal-glow">
                <div className="border-b border-terminal-green/30 px-3 py-1">
                  <span className="text-terminal-bright-green text-sm font-bold">QUICK OVERVIEW</span>
                </div>
                <div className="p-3 space-y-1 text-xs sm:text-sm">
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">USER</span>
                    <span className="text-white">{portfolioData?.cv.name}</span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">ROLE</span>
                    <span className="text-white">{portfolioData?.cv.sections.experience[0].position}</span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">LOC</span>
                    <span className="text-white">{portfolioData?.cv.location}</span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">WEB</span>
                    <span className="text-terminal-green"><a href={portfolioData?.cv.website} className="hover:text-terminal-bright-green hover:underline transition-colors duration-200">{portfolioData?.cv.website}</a></span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">EMAIL</span>
                    <span className="text-terminal-green"><a href={`mailto:${portfolioData?.cv.email}`} className="hover:text-terminal-bright-green hover:underline transition-colors duration-200">{portfolioData?.cv.email}</a></span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">RESUME</span>
                    <span className="text-terminal-green"><a href={portfolioData?.cv.resume_url} className="hover:text-terminal-bright-green hover:underline transition-colors duration-200">resume.pdf</a></span>
                  </div>
                  <div className="flex">
                    <span className="text-terminal-yellow w-16 font-bold">PHONE</span>
                    <span className="text-terminal-green"><a href={`tel:${sanitizedPhone}`} className="hover:text-terminal-bright-green hover:underline transition-colors duration-200">{sanitizedPhone}</a></span>
                  </div>
                </div>
              </div>

              {/* Core Commands Section */}
              <div className="mb-4">
                <p className="text-terminal-green mb-2 text-sm sm:text-base">
                  🚀 Start exploring with these core commands (or click them):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=about" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">about</a></span>
                    <span className="text-white/80">learn more about me</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=skills" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">skills</a></span>
                    <span className="text-white/80">view technical expertise</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=experience" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">experience</a></span>
                    <span className="text-white/80">see professional work</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=projects" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">projects</a></span>
                    <span className="text-white/80">see professional projects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=personal" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">personal</a></span>
                    <span className="text-white/80">see personal projects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-bright-green">→</span>
                    <span className="text-terminal-yellow font-bold"><a href="?cmd=contact" className="hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">contact</a></span>
                    <span className="text-white/80">display contact details</span>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="text-xs sm:text-sm space-y-2">
                <div className="flex items-center space-x-2 text-terminal-green/80">
                  <span>💡</span>
                  <span>Type <span className="font-bold text-terminal-bright-green">help</span> for all commands</span>
                </div>
                  {/* {isInstallable && (
                    <p className="text-terminal-yellow">
                      💡 Install this portfolio as an app for offline access and better performance!
                    </p>
                  )} */}
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
            <span className="text-terminal-bright-green mr-1 sm:mr-2 text-xs sm:text-sm flex-shrink-0">guest@portfolio:~$</span>
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
                placeholder={!hasTyped ? "type any command here and press enter" : ""}
              />
              <span className="absolute text-terminal-green blink text-xs sm:text-sm" style={{ left: `${input.length * 0.6}em`, top: '50%', transform: 'translateY(-45%)' }}>
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
