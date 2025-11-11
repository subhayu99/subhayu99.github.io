/**
 * Terminal Configuration
 *
 * Centralizes all terminal behavior settings including prompt format,
 * history management, and animation timings.
 */

export const terminalConfig = {
  /**
   * Terminal prompt configuration
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
 * Generate the full terminal prompt string
 * Format: username@hostname:directory$
 */
export function getPromptString(): string {
  const { username, hostname, directory, symbol } = terminalConfig.prompt;
  return `${username}@${hostname}:${directory}${symbol}`;
}
