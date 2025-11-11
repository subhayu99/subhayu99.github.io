/**
 * API Configuration
 *
 * Centralizes all API endpoints, fetch settings, and data loading configuration.
 */

// Get the base URL from Vite (respects VITE_BASE_PATH)
const BASE_URL = import.meta.env.BASE_URL || '/';

export const apiConfig = {
  /**
   * Base path for data files (relative to public directory)
   */
  basePath: `${BASE_URL}data`,

  /**
   * API endpoints
   */
  endpoints: {
    resumeData: `${BASE_URL}data/resume.json`,
    styledName: `${BASE_URL}data/styled_name.txt`,
    neofetch: `${BASE_URL}data/neofetch.txt`,
    neofetchSmall: `${BASE_URL}data/neofetch-small.txt`,
  },

  /**
   * React Query / Fetch settings
   */
  query: {
    /**
     * Number of retry attempts for failed requests
     */
    retryAttempts: 3,

    /**
     * Cache time in milliseconds (how long data is considered fresh)
     * Default: 5 minutes
     */
    cacheTime: 5 * 60 * 1000,

    /**
     * Request timeout in milliseconds
     */
    timeout: 10000,
  },

  /**
   * Responsive breakpoints
   */
  responsive: {
    /**
     * Breakpoint for switching between mobile and desktop neofetch display
     */
    neofetchMobileBreakpoint: 1106,
  },

  /**
   * Error messages for API failures
   */
  errors: {
    fetchFailed: 'Failed to fetch data from server',
    timeout: 'Request timed out',
    networkError: 'Network connection error',
  },
} as const;

/**
 * Get full URL for an endpoint
 * Handles both relative and absolute URLs
 */
export function getEndpointUrl(endpoint: string): string {
  // If endpoint is already absolute, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // Return relative path as-is (browser will resolve)
  return endpoint;
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = apiConfig.query.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(apiConfig.errors.timeout);
    }
    throw error;
  }
}
