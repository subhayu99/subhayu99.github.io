/**
 * Storage Configuration
 *
 * Centralizes all localStorage/sessionStorage keys and storage-related settings.
 */

export const storageConfig = {
  /**
   * LocalStorage keys
   */
  keys: {
    /**
     * Key for storing the selected theme
     */
    theme: 'terminal-theme',

    /**
     * Key for storing command history (if persist is enabled)
     */
    commandHistory: 'terminal-history',

    /**
     * Key for storing user preferences
     */
    preferences: 'terminal-preferences',
  },

  /**
   * Storage type preferences
   */
  type: {
    /**
     * Use localStorage for persistent data
     */
    persistent: 'localStorage',

    /**
     * Use sessionStorage for temporary data
     */
    session: 'sessionStorage',
  },

  /**
   * Storage limits and quotas
   */
  limits: {
    /**
     * Maximum number of history items to store
     */
    maxHistoryItems: 100,

    /**
     * Maximum size of stored data in bytes (approximate)
     */
    maxStorageSize: 5 * 1024 * 1024, // 5MB
  },
} as const;

/**
 * Safe localStorage wrapper with error handling
 */
export const storage = {
  /**
   * Get an item from localStorage
   */
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read from localStorage: ${key}`, error);
      return null;
    }
  },

  /**
   * Set an item in localStorage
   */
  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to write to localStorage: ${key}`, error);
      return false;
    }
  },

  /**
   * Remove an item from localStorage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove from localStorage: ${key}`, error);
      return false;
    }
  },

  /**
   * Clear all localStorage
   */
  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
      return false;
    }
  },

  /**
   * Get and parse JSON from localStorage
   */
  getJSON<T>(key: string): T | null {
    const value = this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`Failed to parse JSON from localStorage: ${key}`, error);
      return null;
    }
  },

  /**
   * Set JSON in localStorage
   */
  setJSON(key: string, value: unknown): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.set(key, serialized);
    } catch (error) {
      console.warn(`Failed to serialize JSON for localStorage: ${key}`, error);
      return false;
    }
  },
};
