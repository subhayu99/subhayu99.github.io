import { type PortfolioData } from '@shared/schema';

// Default portfolio data as fallback
export const defaultPortfolioData: PortfolioData = {
  cv: {
    name: "Terminal User",
    location: "Unknown",
    email: "user@terminal.local",
    phone: "+00-000-000-0000",
    social_networks: [],
    sections: {
      intro: ["Loading portfolio data..."],
      technologies: [],
      experience: [],
      education: [],
      selected_projects: [],
      personal_projects: [],
    }
  }
};

export function formatExperiencePeriod(startDate: string, endDate?: string): string {
  return endDate ? `${startDate} - ${endDate}` : `${startDate} - Present`;
}

export function getSocialNetworkUrl(network: string, username: string): string {
  const baseUrls: Record<string, string> = {
    'LinkedIn': 'https://linkedin.com/in/',
    'GitHub': 'https://github.com/',
    'Twitter': 'https://twitter.com/',
    'ORCID': 'https://orcid.org/',
  };
  
  return baseUrls[network] ? `${baseUrls[network]}${username}` : `https://${network.toLowerCase()}.com/${username}`;
}
