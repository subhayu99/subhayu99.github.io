/**
 * UI Text Configuration
 *
 * Centralizes all user-facing text used throughout the terminal.
 *
 * Voice guide:
 *   - Lowercase section titles: `// about`, `// experience`, `// projects`.
 *   - Em-dash (—) not hyphen: "Jan 2021 — Present".
 *   - Terse. No marketing. No "🚀". Emoji reserved for:
 *       - boot sequence
 *       - `konami` easter-egg reveal
 *       - `coffee` easter egg
 *   - Errors are Unix-literal: `bash: foo: command not found`.
 *   - Help tips are one-line, never promotional.
 */

export const uiText = {
  /**
   * Terminal loading and initialization messages
   */
  loading: {
    text: 'initializing terminal…',
    error: 'failed to load portfolio data',
  },

  /**
   * Welcome banner and greeting
   */
  welcome: {
    /** Legacy — unused since Phase 2 swapped welcome to Block chrome. */
    title: '',
  },

  /**
   * Section headers — legacy uppercase values. All commands have been
   * migrated to pass `// lowercase` titles directly; these are kept
   * for backwards compat with any caller that still reads them.
   */
  sections: {
    help: { title: '// help' },
    about: { title: '// about' },
    skills: { title: '// skills' },
    experience: { title: '// experience' },
    education: { title: '// education' },
    projects: { title: '// projects' },
    professionalProjects: { title: '// projects' },
    personalProjects: { title: '// personal' },
    publications: { title: '// publications' },
  },

  /**
   * Error and info messages
   */
  messages: {
    error: {
      commandNotFound: 'bash: {cmd}: command not found',
      invalidArgument: 'invalid argument: {arg}',
      noData: 'no data available',
      portfolioNotLoaded: 'portfolio data not loaded',
      resumeNotFound: 'resume url not found',
      noPublications: 'no publications found',
      noProfessionalProjects: 'no professional projects found',
      noPersonalProjects: 'no personal projects found',
      loadFailed: 'error loading neofetch content',
    },
    info: {
      typeHelp: "type 'help' to see available commands",
      cleared: 'terminal cleared',
      opening: 'opening {target}…',
      connecting: "// let's connect",
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
   * Timeline section headers — lowercase to match the GUI idiom.
   * Rendered as `work`, `research`, etc. inside the timeline block.
   */
  timeline: {
    education: 'education',
    work: 'work',
    project: 'project',
    research: 'research',
  },

  /**
   * Input placeholder text
   */
  input: {
    placeholder: 'type a command…',
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
