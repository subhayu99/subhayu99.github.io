/**
 * Terminal Configuration
 *
 * Centralizes all terminal behavior settings including prompt format,
 * history management, and animation timings.
 */

export const terminalConfig = {
  /**
   * Terminal prompt configuration. The username and directory are
   * dynamic in practice — username is derived from portfolio cv.name
   * at runtime (see `derivePromptUser`), and directory changes with
   * each navigation command (see `usePromptContext` in useTerminal).
   * These values are the fallback defaults used before data loads.
   */
  prompt: {
    username: 'guest',
    hostname: 'portfolio',
    directory: '~',
    symbol: '$',
  },

  /**
   * Command history settings
   */
  history: {
    maxSize: 50,
    persist: false,  // Whether to persist history to localStorage
  },

  /**
   * Animation and timing settings
   */
  animations: {
    typeDelay: 100,  // Milliseconds between each character when typing
    themeReloadDelay: 1000,  // Delay before reloading after theme change
  },
} as const;

/**
 * Generate the full terminal prompt string (legacy, fixed).
 * Format: username@hostname:directory$
 *
 * @deprecated Use `formatPrompt` + the dynamic context from
 *   useTerminal for Starship-style contextual prompts. Kept only as a
 *   fallback for callers not yet on the new plumbing.
 */
export function getPromptString(): string {
  const { username, hostname, directory, symbol } = terminalConfig.prompt;
  return `${username}@${hostname}:${directory}${symbol}`;
}

/** Derive the prompt user from a portfolio CV name — lowercase, no
 *  spaces. Falls back to the configured default if name is empty. */
export function derivePromptUser(name: string | undefined | null): string {
  if (!name) return terminalConfig.prompt.username;
  const slug = name.toLowerCase().split(/\s+/)[0];
  return slug || terminalConfig.prompt.username;
}

/** Starship-style assembled prompt string (no colors — plain text,
 *  used for echo'd command lines in the scrollback). The live input
 *  prompt uses colored spans; see `Terminal.tsx`. */
export function formatPrompt(opts: {
  user?: string;
  host?: string;
  dir?: string;
  symbol?: string;
}): string {
  const user = opts.user ?? terminalConfig.prompt.username;
  const host = opts.host ?? terminalConfig.prompt.hostname;
  const dir = opts.dir ?? terminalConfig.prompt.directory;
  const symbol = opts.symbol ?? terminalConfig.prompt.symbol;
  return `${user}@${host} ${dir} ${symbol}`;
}
