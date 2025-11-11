/**
 * Social Network Configuration
 *
 * Centralizes social network URLs and profile patterns.
 */

export const socialConfig = {
  /**
   * Base URLs for social networks
   * Maps network name to profile URL pattern
   */
  baseUrls: {
    'LinkedIn': 'https://linkedin.com/in/',
    'GitHub': 'https://github.com/',
    'Twitter': 'https://twitter.com/',
    'ORCID': 'https://orcid.org/',
    'GitLab': 'https://gitlab.com/',
    'Stack Overflow': 'https://stackoverflow.com/users/',
    'YouTube': 'https://youtube.com/@',
    'Instagram': 'https://instagram.com/',
    'Facebook': 'https://facebook.com/',
    'Medium': 'https://medium.com/@',
    'Dev.to': 'https://dev.to/',
    'Hashnode': 'https://hashnode.com/@',
  } as Record<string, string>,

  /**
   * Default fallback URL pattern for unknown networks
   * Use {network} and {username} placeholders
   */
  defaultUrlPattern: 'https://{network}.com/{username}',
} as const;

/**
 * Get the full profile URL for a social network
 * @param network - The network name (e.g., 'GitHub', 'LinkedIn')
 * @param username - The user's profile name/handle
 * @returns Full URL to the profile
 */
export function getSocialNetworkUrl(network: string, username: string): string {
  const baseUrl = socialConfig.baseUrls[network];

  if (baseUrl) {
    return `${baseUrl}${username}`;
  }

  // Fallback for unknown networks
  return socialConfig.defaultUrlPattern
    .replace('{network}', network.toLowerCase())
    .replace('{username}', username);
}
