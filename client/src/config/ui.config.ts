/**
 * UI Text Configuration
 *
 * Centralizes all user-facing text, messages, and labels used throughout
 * the terminal interface.
 */

export const uiText = {
  /**
   * Terminal loading and initialization messages
   */
  loading: {
    text: 'Initializing terminal...',
    error: 'Failed to load portfolio data',
  },

  /**
   * Welcome banner and greeting
   */
  welcome: {
    greeting: 'Welcome to my portfolio!',
    title: 'TERMINAL PORTFOLIO',
  },

  /**
   * Section headers
   */
  sections: {
    help: { title: 'AVAILABLE COMMANDS' },
    about: { title: 'ABOUT ME' },
    skills: { title: 'TECHNOLOGIES & SKILLS' },
    experience: { title: 'WORK EXPERIENCE' },
    education: { title: 'EDUCATION' },
    projects: { title: 'PROJECTS' },
    professionalProjects: { title: 'PROFESSIONAL PROJECTS' },
    personalProjects: { title: 'PERSONAL PROJECTS' },
    publications: { title: 'PUBLICATIONS' },
  },

  /**
   * Error and info messages
   */
  messages: {
    error: {
      commandNotFound: 'bash: {cmd}: command not found',
      invalidArgument: 'Invalid argument: {arg}',
      noData: 'No data available',
      portfolioNotLoaded: 'Portfolio data not loaded',
      resumeNotFound: 'Resume URL not found',
      noPublications: 'No publications found',
      noProfessionalProjects: 'No professional projects found',
      noPersonalProjects: 'No personal projects found',
      loadFailed: 'Error loading neofetch content!',
    },
    info: {
      typeHelp: "Type 'help' to see available commands",
      cleared: 'Terminal cleared',
      opening: 'Opening {target}...',
      connecting: "💡 LET'S CONNECT",
    },
  },

  /**
   * Labels and common text
   */
  labels: {
    present: 'Present',
    professional: 'Professional',
    professionalProject: 'Professional Project',
  },

  /**
   * Timeline section headers
   */
  timeline: {
    education: 'EDUCATION',
    work: 'WORK',
    project: 'PROJECT',
    research: 'RESEARCH',
  },

  /**
   * Input placeholder text
   */
  input: {
    placeholder: 'Type a command...',
  },
} as const;

/**
 * Format a message template with variables
 * Example: formatMessage(uiText.messages.error.commandNotFound, { cmd: 'foo' })
 * Returns: "bash: foo: command not found"
 */
export function formatMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}
