import { type PortfolioData } from '@shared/schema';

// Re-export getSocialNetworkUrl from config
export { getSocialNetworkUrl } from '../config';

// Default portfolio data as fallback
export const defaultPortfolioData: PortfolioData = {
  cv: {
    name: "Terminal User",
    resume_url: "/resume.pdf",
    location: "Unknown",
    website: "https://example.com",
    email: "user@terminal.local",
    phone: "+00-000-000-0000",
    social_networks: [],
    sections: {
      intro: ["Loading portfolio data..."],
      technologies: [],
      experience: [],
      education: [],
      professional_projects: [],
      personal_projects: [],
    }
  }
};

export function formatExperiencePeriod(startDate: string, endDate?: string): string {
  return endDate ? `${startDate} - ${endDate}` : `${startDate} - Present`;
}
