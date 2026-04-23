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

/** Parse common CV date shapes (`2024-06`, `2024-06-01`) into a
    "Jun 2024" display string. Falls back to the raw string if parsing fails. */
function formatShortDate(raw: string): string {
  if (!raw) return raw;
  // Date("2024-06") is UTC-midnight of 2024-06-01 in modern engines, which is fine.
  const needsDay = /^\d{4}-\d{2}$/.test(raw);
  const parsed = new Date(needsDay ? `${raw}-01` : raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
  return raw;
}

export function formatExperiencePeriod(startDate: string, endDate?: string): string {
  const start = formatShortDate(startDate);
  const end = endDate ? formatShortDate(endDate) : 'Present';
  // En-dash, not hyphen, for ranges.
  return `${start} – ${end}`;
}
