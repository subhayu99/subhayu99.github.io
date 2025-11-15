import { useState, useCallback, useRef } from 'react';
import { type PortfolioData } from '../../../shared/schema';
import { formatExperiencePeriod, getSocialNetworkUrl } from '../lib/portfolioData';
import { themes } from '../lib/themes';
import { uiText, formatMessage, apiConfig, terminalConfig, storage, storageConfig } from '../config';
import { renderCustomFields } from '../lib/fieldRenderer';
// Import specific date-fns functions for better tree-shaking
import { parse } from 'date-fns/parse';

export interface TerminalLine {
  id: string;
  content: string;
  className?: string;
  isCommand?: boolean;
}

export interface UseTerminalProps {
  portfolioData: PortfolioData | null;
}

function getUsername(portfolioData: PortfolioData, network: string): string | undefined {
  return portfolioData.cv.social_networks?.find(sn => sn.network.toLowerCase() === network.toLowerCase())?.username;
}

// Helper function to parse dates and create timeline events
const parseDate = (dateStr: string): Date => {
  // Handle "Present" or ongoing dates
  if (!dateStr || dateStr.toLowerCase().includes('present') || dateStr.toLowerCase().includes('current')) {
    return new Date(); // Return current date for ongoing items
  }

  // Split date ranges (handle en-dash, em-dash, hyphen, "to")
  const rangeSeparators = ['–', '—', ' - ', ' to '];
  for (const separator of rangeSeparators) {
    if (dateStr.includes(separator)) {
      // Take only the start date from range for sorting purposes
      const [startDate] = dateStr.split(separator).map(s => s.trim());
      return parseDate(startDate);
    }
  }

  // Try multiple date formats
  const formats = [
    'yyyy-MM-dd',      // 2023-03-28
    'yyyy-MM',         // 2022-06
    'yyyy',            // 2021
    'MMM yyyy',        // Jun 2022, May 2025
    'MMMM yyyy',       // January 2022, September 2021
    'MMM. yyyy',       // Jan. 2024
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr.trim(), formatStr, new Date());
      // Check if parse was successful (not Invalid Date)
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Continue to next format
      continue;
    }
  }

  // Fallback: Try to extract year and use January of that year
  const yearMatch = dateStr.match(/\d{4}/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[0]), 0);
  }

  // Last resort: return current date and log error
  console.error(`[Date Parser] Unable to parse date: "${dateStr}". Supported formats: yyyy-MM-dd, yyyy-MM, yyyy, MMM yyyy, MMMM yyyy. Using current date as fallback.`);
  return new Date(); // Return current date instead of epoch
};

const formatDateForDisplay = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short' 
  });
};

const getCollapsibleId = (type: string, index: number): string => `${type}-collapsible-${index}`;

function getProjectsHtml(projectData: Array<Record<string, unknown>>, type: string): string {
  return `
    <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
      <div class="border-b border-terminal-green/30 px-3 py-1">
        <div class="flex items-center justify-between">
          <span class="text-terminal-bright-green text-sm font-bold">${type.toUpperCase()} PROJECTS</span>
          <button 
            onclick="toggleAllCollapsibles('${type}')" 
            class="text-xs px-2 py-1 border border-terminal-green/50 rounded hover:bg-terminal-green/10 transition-colors text-terminal-yellow"
            id="expand-all-btn"
          >
            Expand All
          </button>
        </div>
      </div>
      <div class="p-3 space-y-2 text-xs sm:text-sm">
        ${projectData.map((project, index) => {
          const projectId = getCollapsibleId(type, index);
          return `
            <div class="border border-terminal-green/20 rounded">
              <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${projectId}')">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <span class="text-terminal-yellow font-semibold">${project.name as string}</span>
                    <span class="text-white opacity-60 text-xs ml-2">${project.date as string}</span>
                  </div>
                  <div class="text-terminal-bright-green ml-2">
                    <span id="${projectId}-icon">▶</span>
                  </div>
                </div>
              </div>
              <div id="${projectId}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                <div class="space-y-1">
                  ${(project.highlights as string[] || []).map(highlight => `
                    <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                      • ${highlight}
                    </div>
                  `).join('')}
                </div>
                ${renderCustomFields(project, 'projects')}
              </div>
            </div>
          `;
        }).join('')}
        <div class="border-t border-terminal-green/30 pt-3 mt-4">
          <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
          <div class="space-y-1 ml-2 text-xs">
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to see my professional background</div>
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> to see technologies I've mastered</div>
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=timeline" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">timeline</a></span> for a chronological career overview</div>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

async function getWelcomeMessageHtml(portfolioData: PortfolioData): Promise<string> {
  const sanitizedPhone = portfolioData.cv.phone?.replace(/[^\d+]/g, '') || '';
  const filePath = apiConfig.endpoints.styledName;

  const response = await fetch(filePath);

  let styledName = '';
  if (response.ok) {
    styledName = await response.text();
  }
  // Clean up potential fetch errors (like a 404 returning an HTML page) or empty files.
  if (!styledName || styledName.trim() === '' || (typeof styledName === 'string' && styledName.startsWith('<!DOCTYPE html>'))) {
    styledName = '';
  }
  const usePre = styledName.trim() !== '';

  // Conditionally generate the HTML for the name display.
  let nameDisplayHtml = '';
  if (usePre) {
    // Case 1: We have a styled name. Show it on large screens (`sm` and up)
    // and show a simple fallback on extra-small screens.
    nameDisplayHtml = `
      <pre class="text-terminal-bright-green text-xs leading-tight overflow-x-auto hidden sm:block">${styledName}</pre>
      <div class="sm:hidden text-terminal-bright-green text-center mb-3">
        <div class="text-lg font-bold">${portfolioData.cv.name.toUpperCase()}</div>
        <div class="text-sm">TERMINAL PORTFOLIO</div>
      </div>
    `;
  } else {
    // Case 2: No styled name. Show the simple name on ALL screen sizes.
    // The `sm:hidden` class is removed to make it always visible.
    nameDisplayHtml = `
      <div class="text-terminal-bright-green text-center mb-3">
        <div class="text-lg font-bold">${portfolioData.cv.name.toUpperCase()}</div>
        <div class="text-sm">TERMINAL PORTFOLIO</div>
      </div>
    `;
  }

  return `
    <div class="mb-4 sm:mb-6">
      <div class="mb-3 sm:mb-4">
        ${nameDisplayHtml}
      </div>
      <div class="mb-4">
        <p class="text-terminal-green mb-2 text-sm sm:text-base">Welcome to my portfolio!</p>
        <p class="text-white/80 mb-2 text-xs sm:text-sm leading-relaxed">
          ${portfolioData.cv.sections?.intro[0]}
        </p>
      </div>

      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow">
        <div class="border-b border-terminal-green/30 px-3 py-1">
          <span class="text-terminal-bright-green text-sm font-bold">QUICK OVERVIEW</span>
        </div>
        <div class="p-3 space-y-1 text-xs sm:text-sm">
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">USER</span>
            <span class="text-white">${portfolioData.cv.name}</span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">ROLE</span>
            <span class="text-white">${portfolioData.cv.sections?.experience[0].position}</span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">LOC</span>
            <span class="text-white">${portfolioData.cv.location}</span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">WEB</span>
            <span class="text-terminal-green">${portfolioData.cv.website}</span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">EMAIL</span>
            <span class="text-terminal-green">${portfolioData.cv.email}</span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">RESUME</span>
            <span class="text-terminal-green"><a href="${portfolioData.cv.resume_url}" class="text-terminal-bright-green hover:text-terminal-yellow hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer">resume.pdf</a></span>
          </div>
          <div class="flex">
            <span class="text-terminal-yellow w-16 font-bold">PHONE</span>
            <span class="text-terminal-green"><a href="tel:${sanitizedPhone}" class="text-terminal-bright-green hover:text-terminal-yellow hover:underline cursor-pointer">${sanitizedPhone}</a></span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <p class="text-terminal-green mb-2 text-sm sm:text-base">
          🚀 Start exploring with these core commands (or click them):
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=about" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">about</a></span>
            <span class="text-white/80">learn more about me</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span>
            <span class="text-white/80">view technical expertise</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span>
            <span class="text-white/80">see professional work</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span>
            <span class="text-white/80">see professional projects</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=personal" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">personal</a></span>
            <span class="text-white/80">see personal projects</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-terminal-bright-green">→</span>
            <span class="text-terminal-yellow font-bold"><a href="?cmd=contact" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">contact</a></span>
            <span class="text-white/80">display contact details</span>
          </div>
        </div>
      </div>

      <div class="text-xs sm:text-sm space-y-2">
        <div class="flex items-center space-x-2 text-terminal-green/80">
          <span>💡</span>
          <span>Type <span class="font-bold text-terminal-bright-green"><a href="?cmd=help" class="hover:text-terminal-yellow hover:underline transition-colors duration-200">help</a></span> for all commands</span>
        </div>
        <div class="flex items-center space-x-2 text-terminal-green/40 text-xs">
          <span>✨</span>
          <span>Like this portfolio? Type <span class="text-terminal-green/60"><a href="?cmd=replicate" class="hover:text-terminal-green hover:underline transition-colors duration-200">replicate</a></span> to create your own in ~5 min</span>
        </div>
      </div>
    </div>
  `.trim();
}

// Command Registry Types and Definitions
interface CommandMetadata {
  name: string;
  description: string;
  category: 'information' | 'professional' | 'contact' | 'tools' | 'terminal';
  /**
   * Function to check if command should be available based on portfolio data
   * Returns true if command should be shown, false to hide it
   */
  isAvailable?: (data: PortfolioData | null) => boolean;
  /** Command aliases */
  aliases?: string[];
}

const COMMAND_REGISTRY: CommandMetadata[] = [
  // INFORMATION Commands (always available)
  { name: 'help', description: 'Show this help message', category: 'information' },
  { name: 'resume', description: 'Open resume.pdf in a new tab', category: 'information' },
  { name: 'welcome', description: 'Show the welcome message', category: 'information' },
  { name: 'about', description: 'Learn about my background', category: 'information' },
  { name: 'whoami', description: 'Display current user info', category: 'information' },
  { name: 'neofetch', description: 'Display system information', category: 'information' },

  // PROFESSIONAL Commands (conditional based on data)
  {
    name: 'skills',
    description: 'View my technical skills and expertise',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections?.technologies && data.cv.sections?.technologies.length > 0
  },
  {
    name: 'experience',
    description: 'Browse my work experience',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections?.experience && data.cv.sections?.experience.length > 0
  },
  {
    name: 'education',
    description: 'View my educational background',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections?.education && data.cv.sections?.education.length > 0
  },
  {
    name: 'projects',
    description: 'Explore my professional projects',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections?.professional_projects && data.cv.sections?.professional_projects.length > 0
  },
  {
    name: 'personal',
    description: 'Check out my personal projects',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections?.personal_projects && data.cv.sections?.personal_projects.length > 0
  },
  {
    name: 'publications',
    description: 'View my research publications',
    category: 'professional',
    isAvailable: (data) => !!data?.cv.sections.publication && data.cv.sections.publication.length > 0
  },
  {
    name: 'timeline',
    description: 'Show career timeline',
    category: 'professional',
    isAvailable: (data) => {
      // Timeline needs at least experience or education
      const hasExperience = !!data?.cv.sections?.experience && data.cv.sections?.experience.length > 0;
      const hasEducation = !!data?.cv.sections?.education && data.cv.sections?.education.length > 0;
      return hasExperience || hasEducation;
    }
  },

  // CONTACT Commands (always available)
  { name: 'contact', description: 'Get in touch with me', category: 'contact' },

  // TOOLS Commands (always available)
  { name: 'search', description: 'Search through my portfolio content', category: 'tools' },
  { name: 'theme', description: 'Change terminal color theme', category: 'tools' },
  { name: 'replicate', description: 'Create your own terminal portfolio', category: 'tools', aliases: ['clone', 'fork'] },

  // TERMINAL Commands (always available)
  { name: 'clear', description: 'Clear the terminal screen', category: 'terminal' },
  { name: 'ls', description: 'List available commands', category: 'terminal' },
  { name: 'pwd', description: 'Print working directory', category: 'terminal' },
  { name: 'cat', description: 'Display file contents', category: 'terminal' },
];

export function useTerminal({ portfolioData }: UseTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const lineIdCounter = useRef(0);

  const generateId = () => `line-${++lineIdCounter.current}`;

  const addLine = useCallback((content: string, className?: string, isCommand = false) => {
    setLines(prev => [...prev, { 
      id: generateId(), 
      content, 
      className,
      isCommand 
    }]);
  }, []);

  const addMultipleLines = useCallback((contents: string[], className?: string, delay = terminalConfig.animations.typeDelay) => {
    contents.forEach((content, index) => {
      setTimeout(() => {
        addLine(content, className);
      }, index * delay);
    });
  }, [addLine]);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  // Get available commands based on portfolio data
  const getAvailableCommands = useCallback((): CommandMetadata[] => {
    const standardCommands = COMMAND_REGISTRY.filter(cmd => {
      // If command has no availability check, it's always available
      if (!cmd.isAvailable) return true;
      // Otherwise, check if data meets requirements
      return cmd.isAvailable(portfolioData);
    });

    // Add dynamic section commands (e.g., certifications, awards, volunteer_work)
    const dynamicCommands: CommandMetadata[] = [];
    if (portfolioData?.cv?.sections) {
      const sections = portfolioData.cv.sections as Record<string, unknown[]>;
      const standardSectionNames = ['intro', 'technologies', 'experience', 'education', 'professional_projects', 'personal_projects', 'publication'];

      Object.keys(sections).forEach(sectionName => {
        // Skip standard sections (already in COMMAND_REGISTRY)
        if (standardSectionNames.includes(sectionName)) return;

        // Skip empty sections
        if (!Array.isArray(sections[sectionName]) || sections[sectionName].length === 0) return;

        // Add dynamic section as a command
        dynamicCommands.push({
          name: sectionName,
          description: `Show ${sectionName.replace(/_/g, ' ')} information`,
          category: 'professional',
          isAvailable: () => true, // Already checked above
        });
      });
    }

    return [...standardCommands, ...dynamicCommands];
  }, [portfolioData]);

  // Get all command names including aliases
  const getAllCommandNames = useCallback((): string[] => {
    const available = getAvailableCommands();
    const names: string[] = [];
    available.forEach(cmd => {
      names.push(cmd.name);
      if (cmd.aliases) {
        names.push(...cmd.aliases);
      }
    });
    return names;
  }, [getAvailableCommands]);

  const showWelcomeMessage = useCallback(async () => {
    if (portfolioData) {
      const welcomeHtml = await getWelcomeMessageHtml(portfolioData);
      addLine(welcomeHtml, 'welcome-message'); // Add the entire block as one "line"
    }
  }, [addLine, portfolioData]);

  const showHelp = useCallback(() => {
    // Get available commands and group by category
    const availableCommands = getAvailableCommands();
    const commandsByCategory: Record<string, CommandMetadata[]> = {
      information: [],
      professional: [],
      contact: [],
      tools: [],
      terminal: []
    };

    // Group commands by category
    availableCommands.forEach(cmd => {
      commandsByCategory[cmd.category].push(cmd);
    });

    // Category display config
    const categoryConfig = {
      information: { emoji: '📋', label: 'INFORMATION' },
      professional: { emoji: '💼', label: 'PROFESSIONAL' },
      contact: { emoji: '📧', label: 'CONTACT' },
      tools: { emoji: '🔧', label: 'TOOLS' },
      terminal: { emoji: '⌨️', label: 'TERMINAL' }
    };

    // Generate command HTML for each category
    const generateCategoryHtml = (category: string, commands: CommandMetadata[]) => {
      if (commands.length === 0) return '';
      const config = categoryConfig[category as keyof typeof categoryConfig];
      const commandsHtml = commands.map(cmd => {
        const argHint = ['search', 'theme', 'cat'].includes(cmd.name) ? '<span class="text-white"> [...]</span>' : '';
        return `<div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=${cmd.name}" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">${cmd.name}</a></span>${argHint}</div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">${cmd.description}</span></div></div>`;
      }).join('\n              ');

      return `
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">${config.emoji} ${config.label}</div>
            <div class="space-y-1 ml-2">
              ${commandsHtml}
            </div>
          </div>`;
    };

    // Build help box HTML
    const helpBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">AVAILABLE COMMANDS</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          ${generateCategoryHtml('information', commandsByCategory.information)}
          ${generateCategoryHtml('professional', commandsByCategory.professional)}
          ${generateCategoryHtml('contact', commandsByCategory.contact)}
          ${generateCategoryHtml('tools', commandsByCategory.tools)}
          ${generateCategoryHtml('terminal', commandsByCategory.terminal)}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 QUICK TIPS</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Use <span class="text-terminal-bright-green font-semibold">Tab</span> for auto-completion</div>
              <div><span class="text-white">•</span> Use <span class="text-terminal-bright-green font-semibold">↑↓</span> arrow keys to navigate command history</div>
              <div><span class="text-white">•</span> Use <span class="text-terminal-bright-green font-semibold">Ctrl+C</span> to interrupt current operation</div>
              <div><span class="text-white">•</span> Use <span class="text-terminal-bright-green font-semibold">Ctrl+L</span> to clear screen quickly</div>
              <div><span class="text-white">•</span> Click anywhere on the terminal to focus input</div>
            </div>
          </div>
          <div class="text-terminal-white text-center pt-2 border-t border-terminal-green/20">
            Start with \`<a href="?cmd=about" class="hover:text-terminal-yellow hover:underline transition-colors duration-200">about</a>\` to learn more about me, or try \`<a href="?cmd=neofetch" class="hover:text-terminal-yellow hover:underline transition-colors duration-200">neofetch</a>\` for a quick overview!
          </div>
        </div>
      </div>
    `.trim();

    // Add the entire help box as a single line
    addLine(helpBox, 'w-full');
  }, [addLine, getAvailableCommands]);

  const openResumePdf = useCallback(() => {
    if (portfolioData) {
      const resumeUrl = portfolioData.cv.resume_url;
      if (resumeUrl) {
        window.open(resumeUrl, '_blank');
        addLine(`Opened ${resumeUrl} in a new tab`, 'text-terminal-green');
      } else {
        addLine(uiText.messages.error.resumeNotFound, 'text-terminal-red');
      }
    } else {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
    }
  }, [portfolioData]);

  const showReplicate = useCallback(() => {
    const replicateBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-lg font-bold">🎨 CREATE YOUR OWN TERMINAL PORTFOLIO</span>
        </div>
        <div class="p-4 space-y-4 text-sm">

          <!-- AI-Powered Resume Converter -->
          <div class="border border-terminal-cyan/40 rounded p-3 bg-terminal-cyan/10">
            <div class="text-terminal-cyan font-bold text-base mb-2 flex items-center gap-2">
              <span>🔄 AI-POWERED RESUME CONVERTER</span>
              <span class="text-xs bg-terminal-cyan/30 px-2 py-0.5 rounded">⚡ Fastest method</span>
            </div>
            <div class="text-terminal-green mb-3">
              <strong>Already have a resume?</strong> Convert it to YAML format using AI in ~2 minutes. No manual typing!
            </div>
            <div class="space-y-2 ml-3 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-terminal-cyan font-bold">1.</span>
                <span class="text-white">Click the button below to get the AI conversion prompt</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-cyan font-bold">2.</span>
                <span class="text-white">Copy the prompt and paste it into ChatGPT/Claude/Gemini</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-cyan font-bold">3.</span>
                <span class="text-white">Attach or paste your existing resume (PDF, text, or LinkedIn)</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-cyan font-bold">4.</span>
                <span class="text-white">AI generates perfect YAML - save as </span>
                <code class="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code>
              </div>
            </div>
            <div class="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <button
                id="open-ai-prompt-modal"
                class="bg-terminal-cyan/20 hover:bg-terminal-cyan/30 border border-terminal-cyan/50 px-4 py-2 rounded text-terminal-bright-cyan font-semibold transition-all duration-200 hover:scale-105 cursor-pointer">
                📋 Get AI Conversion Prompt
              </button>
              <div class="text-xs text-terminal-cyan/70">
                Works with any AI assistant (ChatGPT, Claude, Gemini)
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-terminal-cyan/20 text-xs text-terminal-green flex flex-wrap items-center gap-3">
              <span>⚡ ~2 minutes</span>
              <span>🤖 AI-powered</span>
              <span>💯 Perfect formatting</span>
              <span>📝 Supports any resume format</span>
            </div>
          </div>

          <!-- Easy Mode Section -->
          <div class="border border-terminal-yellow/30 rounded p-3 bg-terminal-yellow/5">
            <div class="text-terminal-bright-yellow font-bold text-base mb-3 flex items-center gap-2">
              <span>🌟 EASY MODE</span>
              <span class="text-xs bg-terminal-yellow/20 px-2 py-0.5 rounded">Zero-code setup</span>
            </div>
            <div class="text-terminal-green mb-3">
              <strong>True zero-code deployment!</strong> Everything auto-generates - just upload your resume YAML.
            </div>
            <div class="space-y-2 ml-3">
              <div class="flex items-start gap-2">
                <span class="text-terminal-yellow font-bold">1.</span>
                <div>
                  <span class="text-white">Create </span>
                  <code class="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code>
                  <span class="text-white"> (use </span>
                  <a href="https://app.rendercv.com" target="_blank" rel="noopener noreferrer"
                     class="text-terminal-bright-green hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                    RenderCV
                  </a>
                  <span class="text-white"> or AI - see above)</span>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-yellow font-bold">2.</span>
                <div>
                  <span class="text-white">Click </span>
                  <a href="https://github.com/subhayu99/subhayu99.github.io/generate" target="_blank" rel="noopener noreferrer"
                     class="text-terminal-bright-green hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                    "Use this template"
                  </a>
                  <span class="text-white"> → Name it </span>
                  <code class="text-terminal-bright-green bg-black/30 px-1">yourusername.github.io</code>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-yellow font-bold">3.</span>
                <div>
                  <span class="text-white">Enable GitHub Actions & Pages: </span>
                  <span class="text-terminal-bright-yellow">Settings → Pages → Deploy from Actions</span>
                  <div class="text-terminal-yellow/70 text-xs mt-1">⚠️ Do this BEFORE uploading resume to avoid errors!</div>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-yellow font-bold">4.</span>
                <div>
                  <span class="text-white">Upload your </span>
                  <code class="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code>
                  <span class="text-white"> to the repo - deployment starts automatically!</span>
                </div>
              </div>
            </div>
            <div class="mt-3 p-2 bg-black/30 rounded border border-terminal-green/30">
              <div class="text-terminal-bright-green font-bold text-xs mb-1">✨ Auto-Generated Features:</div>
              <div class="text-terminal-green/80 text-xs space-y-0.5 ml-2">
                <div>• ASCII art name banner (from your name)</div>
                <div>• PWA manifest.json (installable app)</div>
                <div>• PDF resume (formatted and downloadable)</div>
                <div>• Neofetch banner (if custom file not provided)</div>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-terminal-yellow/20 text-xs text-terminal-green flex items-center justify-between">
              <span>⏱️ Time: ~5 min</span>
              <span>✨ Auto-Generated</span>
              <span>💰 Free Forever</span>
              <span>💻 Zero Code</span>
            </div>
          </div>

          <!-- Advanced Mode Section -->
          <div class="border border-terminal-blue/30 rounded p-3 bg-terminal-blue/5">
            <div class="text-terminal-bright-blue font-bold text-base mb-3">
              🔧 ADVANCED MODE
            </div>
            <div class="text-terminal-green mb-3">
              Full control over themes, commands, and features. Requires npm/git knowledge.
            </div>
            <div class="space-y-2 ml-3">
              <div class="flex items-start gap-2">
                <span class="text-terminal-blue font-bold">1.</span>
                <div>
                  <span class="text-white">Clone the template and install dependencies:</span>
                  <div class="bg-black/50 rounded p-2 mt-1 font-mono text-xs text-terminal-green">
                    git clone https://github.com/subhayu99/subhayu99.github.io.git<br/>
                    cd subhayu99.github.io<br/>
                    npm install
                  </div>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-blue font-bold">2.</span>
                <div>
                  <span class="text-white">Copy and customize config files:</span>
                  <div class="bg-black/50 rounded p-2 mt-1 font-mono text-xs text-terminal-green">
                    cp template.config.yaml.example template.config.yaml<br/>
                    cp .env.example .env<br/>
                    cp client/public/manifest.json.example client/public/manifest.json
                  </div>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-blue font-bold">3.</span>
                <div>
                  <span class="text-white">Add your resume and customize themes/commands</span>
                  <div class="text-terminal-green/70 text-xs mt-1">✓ See ADVANCED.md for customization guide</div>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-terminal-blue font-bold">4.</span>
                <div>
                  <span class="text-white">Deploy to GitHub Pages</span>
                  <div class="text-terminal-green/70 text-xs mt-1">✓ Push to GitHub and enable Actions</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Get Started CTA -->
          <div class="border border-terminal-bright-green/40 rounded p-3 bg-terminal-green/5 text-center">
            <div class="text-terminal-bright-green font-bold text-base mb-2">🚀 Ready to Create Your Portfolio?</div>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="https://github.com/subhayu99/subhayu99.github.io/generate" target="_blank" rel="noopener noreferrer"
                 class="inline-block bg-terminal-green/20 hover:bg-terminal-green/30 border border-terminal-green text-terminal-bright-green font-bold px-4 py-2 rounded transition-all duration-200 hover:scale-105">
                ⚡ Get Started Now
              </a>
              <span class="text-terminal-green/70 text-xs">~5 minutes • Zero coding required</span>
            </div>
          </div>

          <!-- Quick Links Section -->
          <div class="border-t border-terminal-green/30 pt-3 mt-3">
            <div class="text-terminal-bright-green font-bold mb-2">📚 Documentation & Help</div>
            <div class="grid grid-cols-2 gap-2 text-xs ml-3">
              <div>
                <a href="https://github.com/subhayu99/subhayu99.github.io#readme" target="_blank" rel="noopener noreferrer"
                   class="text-terminal-yellow hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                  📖 Easy Mode Guide
                </a>
              </div>
              <div>
                <a href="https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/ADVANCED.md" target="_blank" rel="noopener noreferrer"
                   class="text-terminal-yellow hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                  🔧 Advanced Customization
                </a>
              </div>
              <div>
                <a href="https://app.rendercv.com" target="_blank" rel="noopener noreferrer"
                   class="text-terminal-yellow hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                  🎨 RenderCV Builder
                </a>
              </div>
              <div>
                <a href="https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/TROUBLESHOOTING.md" target="_blank" rel="noopener noreferrer"
                   class="text-terminal-yellow hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                  🛟 Troubleshooting
                </a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-xs text-terminal-green/70 border-t border-terminal-green/20 pt-3 space-y-1">
            <div>⚡ Built with ❤️ by developers, for developers</div>
            <div class="flex items-center justify-center gap-4">
              <a href="https://github.com/subhayu99/subhayu99.github.io" target="_blank" rel="noopener noreferrer"
                 class="text-terminal-yellow hover:text-terminal-bright-yellow hover:underline transition-colors duration-200">
                ⭐ Star on GitHub
              </a>
              <span>•</span>
              <span>🤖 AI-Assisted Setup</span>
              <span>•</span>
              <span>✨ Auto-Generated</span>
            </div>
          </div>
        </div>
      </div>
    `;

    addLine(replicateBox);

    // Add event listener for AI prompt modal after DOM renders
    setTimeout(() => {
      const openModalBtn = document.getElementById('open-ai-prompt-modal');
      if (openModalBtn) {
        openModalBtn.addEventListener('click', async () => {
          // Fetch the AI prompt
          try {
            const response = await fetch(`${apiConfig.basePath}/ai-resume-prompt.txt`);
            if (!response.ok) throw new Error('Failed to fetch prompt');
            const promptText = await response.text();

            // Create modal
            const modal = document.createElement('div');
            modal.id = 'ai-prompt-modal';
            modal.innerHTML = `
              <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-overlay">
                <div class="bg-terminal-bg border-2 border-terminal-cyan rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                  <!-- Header -->
                  <div class="border-b border-terminal-cyan/50 px-4 py-3 flex items-center justify-between bg-terminal-cyan/10">
                    <div class="flex items-center gap-3">
                      <span class="text-terminal-cyan font-bold text-lg">🤖 AI Resume Conversion Prompt</span>
                      <span class="text-xs bg-terminal-cyan/30 px-2 py-1 rounded text-terminal-cyan">Ready to Copy</span>
                    </div>
                    <button id="close-modal" class="text-terminal-cyan hover:text-terminal-bright-cyan text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-terminal-cyan/20 rounded transition-all">
                      ×
                    </button>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div class="text-terminal-green text-sm space-y-2">
                      <p><strong>How to use this prompt:</strong></p>
                      <ol class="list-decimal list-inside space-y-1 ml-2">
                        <li>Copy the prompt below using the button</li>
                        <li>Open ChatGPT, Claude, or Gemini</li>
                        <li>Paste the prompt</li>
                        <li>Attach or paste your existing resume (PDF, text, LinkedIn profile, etc.)</li>
                        <li>AI will generate perfect YAML - save it as <code class="bg-black/50 px-1 rounded text-terminal-bright-green">resume.yaml</code></li>
                      </ol>
                    </div>

                    <!-- Prompt Display -->
                    <div class="bg-black/50 rounded border border-terminal-cyan/30 p-4 overflow-x-auto">
                      <pre class="text-terminal-green text-xs leading-relaxed font-mono whitespace-pre-wrap">${promptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="border-t border-terminal-cyan/50 px-4 py-3 bg-terminal-cyan/5 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <div class="text-xs text-terminal-cyan/70">
                      Prompt size: ${(promptText.length / 1024).toFixed(1)} KB
                    </div>
                    <div class="flex gap-2">
                      <button id="copy-prompt-btn" class="bg-terminal-cyan/20 hover:bg-terminal-cyan/30 border border-terminal-cyan/50 px-4 py-2 rounded text-terminal-bright-cyan font-semibold transition-all">
                        📋 Copy Prompt
                      </button>
                      <button id="close-modal-btn" class="bg-terminal-red/20 hover:bg-terminal-red/30 border border-terminal-red/50 px-4 py-2 rounded text-terminal-red font-semibold transition-all">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;

            document.body.appendChild(modal);

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Copy button handler
            const copyBtn = document.getElementById('copy-prompt-btn');
            copyBtn?.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(promptText);
                copyBtn.textContent = '✓ Copied!';
                copyBtn.classList.add('bg-terminal-green/30', 'border-terminal-green/50', 'text-terminal-bright-green');
                setTimeout(() => {
                  copyBtn.textContent = '📋 Copy Prompt';
                  copyBtn.classList.remove('bg-terminal-green/30', 'border-terminal-green/50', 'text-terminal-bright-green');
                }, 2000);
              } catch (err) {
                console.error('Failed to copy:', err);
                copyBtn.textContent = '❌ Copy Failed';
                setTimeout(() => {
                  copyBtn.textContent = '📋 Copy Prompt';
                }, 2000);
              }
            });

            // Close modal handlers
            const closeModal = () => {
              modal.remove();
              document.body.style.overflow = '';
            };

            document.getElementById('close-modal')?.addEventListener('click', closeModal);
            document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
            document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
              if ((e.target as HTMLElement)?.id === 'modal-overlay') closeModal();
            });

            // Escape key to close
            const escHandler = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
              }
            };
            document.addEventListener('keydown', escHandler);

          } catch (error) {
            console.error('Failed to load AI prompt:', error);
            alert('Failed to load the AI conversion prompt. Please try again or check your connection.');
          }
        });
      }
    }, 100);
  }, [addLine]);

  const showAbout = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    // Create the about content as a single HTML string, matching showHelp structure
    const aboutBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">ABOUT ME</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">👋 INTRODUCTION</div>
            <div class="space-y-2 ml-2">
              ${portfolioData.cv.sections?.intro.map(paragraph => 
                `<div class="text-white leading-relaxed bg-terminal-green/5 p-2 rounded">${paragraph}</div>`
              ).join('')}
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">🔗 QUICK LINKS</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Portfolio</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">
                    <a href="${portfolioData.cv.website}" class="hover:text-terminal-bright-green">${portfolioData.cv.website?.replace('https://', '').trim()}</a> (you are here)
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Email</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">
                    <a href="mailto:${portfolioData.cv.email}" class="hover:text-terminal-bright-green">${portfolioData.cv.email}</a>
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">GitHub</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">
                    <a href="https://github.com/${getUsername(portfolioData, 'GitHub')}" class="hover:text-terminal-bright-green">
                      ${getUsername(portfolioData, 'GitHub')}
                    </a>
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">LinkedIn</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">
                    <a href="https://linkedin.com/in/${getUsername(portfolioData, 'LinkedIn')}" class="hover:text-terminal-bright-green">
                      ${getUsername(portfolioData, 'LinkedIn')}
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 NEXT STEPS</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=contact" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">contact</a></span> for all my social links</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> to see my technical expertise</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to view my work history</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to explore my work</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire about box as a single line
    addLine(aboutBox, 'w-full');
  }, [addLine, portfolioData]);

  /**
   * Generic section renderer for dynamic sections (e.g., certifications, awards, volunteer_work)
   * Automatically detects entry type and renders accordingly
   */
  const showGenericSection = useCallback((sectionName: string, sectionData: unknown[]) => {
    if (!portfolioData || !sectionData || sectionData.length === 0) {
      addLine(`No data available for section: ${sectionName}`, 'text-terminal-yellow');
      return;
    }

    // Format section name for display (e.g., "certifications" -> "CERTIFICATIONS")
    const displayTitle = sectionName.replace(/_/g, ' ').toUpperCase();

    const sectionBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">${displayTitle}</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${sectionData.map((entry, index) => {
            // Handle text entries (simple strings)
            if (typeof entry === 'string') {
              return `
                <div class="border-b border-terminal-green/20 pb-2 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="text-white text-xs">${entry}</div>
                </div>
              `;
            }

            // Handle object entries
            const item = entry as Record<string, unknown>;

            // Render based on detected entry type
            if ('company' in item && 'position' in item) {
              // Experience-like entry
              const period = formatExperiencePeriod(item.start_date as string, item.end_date as string | undefined);
              return `
                <div class="border-b border-terminal-green/20 pb-4 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="mb-3">
                    <div class="bg-terminal-green/5 p-2 rounded mb-2">
                      <span class="text-terminal-yellow font-semibold">${item.position}</span>
                      <span class="text-white"> @ </span>
                      <span class="text-terminal-bright-green font-bold">${item.company}</span>
                    </div>
                    ${item.location ? `<div class="ml-2"><span class="text-white opacity-80 text-xs">${item.location} | ${period}</span></div>` : `<div class="ml-2"><span class="text-white opacity-80 text-xs">${period}</span></div>`}
                  </div>
                  ${item.highlights && Array.isArray(item.highlights) && (item.highlights as unknown[]).length > 0 ? `
                    <div class="ml-2">
                      <div class="text-terminal-bright-green font-semibold mb-2 text-xs">Key Achievements:</div>
                      <div class="space-y-1">
                        ${(item.highlights as string[]).map(h => `
                          <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">• ${h}</div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                  ${renderCustomFields(item, 'experience')}
                </div>
              `;
            } else if ('institution' in item && 'area' in item) {
              // Education-like entry
              return `
                <div class="border-b border-terminal-green/20 pb-4 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="mb-3">
                    <div class="bg-terminal-green/5 p-2 rounded mb-2">
                      <span class="text-terminal-bright-green font-bold">${item.institution}</span>
                    </div>
                    <div class="ml-2 space-y-1">
                      <div><span class="text-terminal-yellow font-semibold">${item.degree || ''} ${item.area}</span></div>
                      ${item.start_date ? `<div class="text-white opacity-80 text-xs">${item.start_date} - ${item.end_date || 'Present'}</div>` : ''}
                    </div>
                  </div>
                  ${item.highlights && Array.isArray(item.highlights) && (item.highlights as unknown[]).length > 0 ? `
                    <div class="ml-2">
                      <div class="space-y-1">
                        ${(item.highlights as string[]).map(h => `
                          <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">• ${h}</div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                  ${renderCustomFields(item, 'education')}
                </div>
              `;
            } else if ('name' in item) {
              // Project-like entry (NormalEntry - covers certifications, awards, etc.)
              return `
                <div class="border-b border-terminal-green/20 pb-4 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="mb-3">
                    <div class="bg-terminal-green/5 p-2 rounded mb-2">
                      <span class="text-terminal-bright-green font-bold">${item.name}</span>
                      ${item.date ? `<span class="text-white opacity-60 text-xs ml-2">(${item.date})</span>` : ''}
                    </div>
                  </div>
                  ${item.highlights && Array.isArray(item.highlights) && (item.highlights as unknown[]).length > 0 ? `
                    <div class="ml-2">
                      <div class="space-y-1">
                        ${(item.highlights as string[]).map(h => `
                          <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">• ${h}</div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                  ${renderCustomFields(item, 'projects')}
                </div>
              `;
            } else if ('label' in item && 'details' in item) {
              // OneLineEntry (like technologies)
              return `
                <div class="border-b border-terminal-green/20 pb-2 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="flex gap-2">
                    <span class="text-terminal-yellow font-semibold min-w-[100px]">${item.label}:</span>
                    <span class="text-white">${item.details}</span>
                  </div>
                  ${renderCustomFields(item, 'technologies')}
                </div>
              `;
            } else {
              // Unknown entry type - render as JSON for debugging
              return `
                <div class="border-b border-terminal-green/20 pb-2 ${index === sectionData.length - 1 ? 'border-b-0 pb-0' : ''}">
                  <div class="text-white text-xs font-mono bg-terminal-green/5 p-2 rounded">${JSON.stringify(item, null, 2)}</div>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>
    `.trim();

    addLine(sectionBox, 'w-full');
  }, [addLine, portfolioData, formatExperiencePeriod]);

  const showSkills = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    // Create the skills content as a single HTML string, matching showAbout structure
    const skillsBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">SKILLS & TECHNOLOGIES</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div class="space-y-1 ml-2">
            ${portfolioData.cv.sections?.technologies.map(tech => `
              <div class="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2">
                <div class="md:col-span-3 bg-terminal-green/10 p-2 rounded">
                  <span class="text-terminal-yellow font-semibold mb-1">${tech.label}</span>
                </div>
                <div class="md:col-span-9 bg-terminal-green/5 p-2 rounded ml-3">
                  <span class="text-white">${tech.details}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 EXPLORE MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to see these skills in action</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to see how I've applied them professionally</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=personal" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">personal</a></span> to explore my open source contributions</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire skills box as a single line
    addLine(skillsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showExperience = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    // Create the experience content as a single HTML string, matching showSkills structure
    const experienceBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">PROFESSIONAL EXPERIENCE</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${portfolioData.cv.sections?.experience.map((job, index) => {
            const period = formatExperiencePeriod(job.start_date, job.end_date);
            return `
              <div class="border-b border-terminal-green/20 pb-4 ${index === portfolioData.cv.sections?.experience.length - 1 ? 'border-b-0 pb-0' : ''}">
                <div class="mb-3">
                  <div class="bg-terminal-green/5 p-2 rounded mb-2">
                    <span class="text-terminal-yellow font-semibold">${job.position}</span>
                    <span class="text-white"> @ </span>
                    <span class="text-terminal-bright-green font-bold">${job.company}</span>
                  </div>
                  <div class="ml-2">
                    <span class="text-white opacity-80 text-xs">${job.location} | ${period}</span>
                  </div>
                </div>
                <div class="ml-2">
                  <div class="text-terminal-bright-green font-semibold mb-2 text-xs">Key Achievements:</div>
                  <div class="space-y-1">
                    ${job.highlights.map(highlight => `
                      <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                        • ${highlight}
                      </div>
                    `).join('')}
                  </div>
                  ${renderCustomFields(job, 'experience')}
                </div>
              </div>
            `;
          }).join('')}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to see specific work examples</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> to see technologies I've mastered</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=timeline" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">timeline</a></span> for a chronological career overview</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire experience box as a single line
    addLine(experienceBox, 'w-full');
  }, [addLine, portfolioData, formatExperiencePeriod]);

  const showEducation = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    // Create the education content as a single HTML string, matching showExperience structure
    const educationBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">EDUCATION</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${portfolioData.cv.sections?.education.map((edu, index) => {
            const period = `${edu.start_date} - ${edu.end_date}`;
            return `
              <div class="border-b border-terminal-green/20 pb-4 ${index === portfolioData.cv.sections?.education.length - 1 ? 'border-b-0 pb-0' : ''}">
                <div class="mb-3">
                  <div class="bg-terminal-green/5 p-2 rounded mb-2">
                    <span class="text-terminal-yellow font-semibold">${edu.degree} in ${edu.area}</span>
                    <span class="text-white"> from </span>
                    <span class="text-terminal-bright-green font-bold">${edu.institution}</span>
                  </div>
                  <div class="ml-2">
                    <span class="text-white opacity-80 text-xs">${edu.location || ""} | ${period}</span>
                  </div>
                </div>
                ${edu.highlights && edu.highlights.length > 0 ? `
                  <div class="ml-2">
                    <div class="text-terminal-bright-green font-semibold mb-2 text-xs">Highlights:</div>
                    <div class="space-y-1">
                      ${edu.highlights.map(highlight => `
                        <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                          • ${highlight}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                <div class="ml-2">
                  ${renderCustomFields(edu, 'education')}
                </div>
              </div>
            `;
          }).join('')}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to see my professional background</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> to see technologies I've mastered</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to see specific work examples</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire education box as a single line
    addLine(educationBox, 'w-full');
  }, [addLine, portfolioData]);

  const showProjects = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    if (!portfolioData?.cv.sections?.professional_projects || portfolioData.cv.sections?.professional_projects.length === 0) {
      addLine(uiText.messages.error.noProfessionalProjects, 'text-terminal-red');
      return;
    }

    // Create the projects content as a single HTML string with collapsible functionality
    const projectsBox = getProjectsHtml(portfolioData.cv.sections?.professional_projects, 'professional');

    // Add the entire projects box as a single line
    addLine(projectsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showPersonalProjects = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    if (!portfolioData?.cv.sections?.personal_projects || portfolioData.cv.sections?.personal_projects.length === 0) {
      addLine(uiText.messages.error.noPersonalProjects, 'text-terminal-red');
      return;
    }

    // Create the projects content as a single HTML string with collapsible functionality
    const projectsBox = getProjectsHtml(portfolioData.cv.sections?.personal_projects, 'personal');

    // Add the entire projects box as a single line
    addLine(projectsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showPublications = useCallback(() => {
    if (!portfolioData?.cv.sections.publication || portfolioData.cv.sections.publication.length === 0) {
      addLine(uiText.messages.error.noPublications, 'text-terminal-red');
      return;
    }

    const publications = portfolioData.cv.sections.publication;

    // Create the publications content as a single HTML string, matching showAbout/showExperience structure
    const publicationsBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">RESEARCH PUBLICATIONS</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${publications.map((pub, index) => `
            <div class="border-b border-terminal-green/20 pb-4 ${index === publications.length - 1 ? 'border-b-0 pb-0' : ''}">
              <div class="mb-3">
              <div class="bg-terminal-green/5 p-2 rounded mb-2">
                <span class="text-terminal-bright-green font-semibold">${pub.title}</span>
              </div>
              <div class="ml-2 space-y-1">
                <div class="grid grid-cols-12 gap-1">
                  <div class="col-span-2 bg-terminal-green/10">
                    <span class="text-terminal-yellow font-semibold">Authors</span>
                  </div>
                  <div class="col-span-10 bg-terminal-green/5">
                    <span class="text-white opacity-80">${pub.authors.join(', ')}</span>
                  </div>
                </div>
                <div class="grid grid-cols-12 gap-1">
                  <div class="col-span-2 bg-terminal-green/10">
                    <span class="text-terminal-yellow font-semibold">Journal</span>
                  </div>
                  <div class="col-span-10 bg-terminal-green/5">
                    <span class="text-white opacity-80">${pub.journal}</span>
                  </div>
                </div>
                <div class="grid grid-cols-12 gap-1">
                  <div class="col-span-2 bg-terminal-green/10">
                    <span class="text-terminal-yellow font-semibold">Date</span>
                  </div>
                  <div class="col-span-10 bg-terminal-green/5">
                    <span class="text-white opacity-80">${pub.date}</span>
                  </div>
                </div>
                ${pub.doi ? `
                  <div class="grid grid-cols-12 gap-1">
                    <div class="col-span-2 bg-terminal-green/10">
                      <span class="text-terminal-yellow font-semibold">DOI</span>
                    </div>
                    <div class="col-span-10 bg-terminal-green/5">
                      https://doi.org/${pub.doi}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 EXPLORE MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to see my professional background</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to view practical applications</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=contact" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">contact</a></span> to discuss research collaboration</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire publications box as a single line
    addLine(publicationsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showTimeline = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const timelineEvents: Array<{
      date: Date;
      dateStr: string;
      type: 'education' | 'experience' | 'project' | 'publication';
      title: string;
      subtitle?: string;
      endDate?: Date;
      endDateStr?: string;
      description?: string;
      status: 'completed' | 'ongoing';
    }> = [];

    // Add education events
    portfolioData.cv.sections?.education.forEach(edu => {
      timelineEvents.push({
        date: parseDate(edu.start_date),
        dateStr: edu.start_date,
        type: 'education',
        title: `${edu.degree} in ${edu.area}`,
        subtitle: edu.institution,
        endDate: parseDate(edu.end_date),
        endDateStr: edu.end_date,
        description: edu.location || "",
        status: 'completed'
      });
    });

    // Add experience events
    portfolioData.cv.sections?.experience.forEach(exp => {
      timelineEvents.push({
        date: parseDate(exp.start_date),
        dateStr: exp.start_date,
        type: 'experience',
        title: exp.position,
        subtitle: exp.company,
        endDate: exp.end_date ? parseDate(exp.end_date) : undefined,
        endDateStr: exp.end_date,
        description: exp.location,
        status: exp.end_date ? 'completed' : 'ongoing'
      });
    });

    // Add major projects (limit to recent ones to avoid clutter)
    portfolioData.cv.sections?.professional_projects
      .slice(0, 3) // Take only top 3 projects
      .forEach(proj => {
        const dateRange = proj.date.split(' – ');
        const startDate = dateRange[0].trim();
        const endDate = dateRange[1]?.trim();
        
        timelineEvents.push({
          date: parseDate(startDate),
          dateStr: startDate,
          type: 'project',
          title: proj.name,
          subtitle: uiText.labels.professionalProject,
          endDate: endDate ? parseDate(endDate) : undefined,
          endDateStr: endDate,
          status: endDate ? 'completed' : 'ongoing'
        });
      });

    // Add publications
    if (portfolioData.cv.sections.publication) {
      portfolioData.cv.sections.publication.forEach(pub => {
        timelineEvents.push({
          date: parseDate(pub.date),
          dateStr: pub.date,
          type: 'publication',
          title: pub.title,
          subtitle: pub.journal,
          status: 'completed'
        });
      });
    }

    // Sort events by date (newest last for better visual flow)
    timelineEvents.sort((a, b) => {
      // First priority: ongoing items come first
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      
      // Second priority: if both are ongoing, sort by start date (most recent first)
      if (a.status === 'ongoing' && b.status === 'ongoing') {
        return b.date.getTime() - a.date.getTime();
      }
      
      // Third priority: for completed items, sort by end date if available, otherwise start date
      const aEndDate = a.endDate || a.date;
      const bEndDate = b.endDate || b.date;
      
      return bEndDate.getTime() - aEndDate.getTime();
    }).reverse();

    // Create the timeline HTML
    const timelineBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-5xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">CAREER TIMELINE</span>
        </div>
        <div class="p-4">
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-terminal-bright-green via-terminal-green to-terminal-green/30"></div>
            
            <!-- Timeline events -->
            <div class="space-y-6">
              ${timelineEvents.map((event, index) => {
                const isOngoing = event.status === 'ongoing';
                const duration = event.endDateStr ? 
                  `${formatDateForDisplay(event.dateStr)} - ${isOngoing ? uiText.labels.present : formatDateForDisplay(event.endDateStr)}` :
                  formatDateForDisplay(event.dateStr);
                
                const getIcon = (type: string) => {
                  switch (type) {
                    case 'education': return '🎓';
                    case 'experience': return '💼';
                    case 'project': return '🚀';
                    case 'publication': return '📝';
                    default: return '•';
                  }
                };

                const getTypeColor = (type: string) => {
                  switch (type) {
                    case 'education': return 'text-blue-400';
                    case 'experience': return 'text-terminal-bright-green';
                    case 'project': return 'text-purple-400';
                    case 'publication': return 'text-yellow-400';
                    default: return 'text-white';
                  }
                };

                const getTypeLabel = (type: string) => {
                  switch (type) {
                    case 'education': return uiText.timeline.education;
                    case 'experience': return uiText.timeline.work;
                    case 'project': return uiText.timeline.project;
                    case 'publication': return uiText.timeline.research;
                    default: return type.toUpperCase();
                  }
                };

                return `
                  <div class="relative flex items-start space-x-4 group">
                    <!-- Timeline dot -->
                    <div class="relative z-10">
                      <div class="w-4 h-4 rounded-full bg-terminal-green border-2 border-terminal-bright-green 
                                  ${isOngoing ? 'animate-pulse shadow-lg shadow-terminal-green/50' : ''} 
                                  group-hover:scale-125 transition-transform duration-200"></div>
                    </div>
                    
                    <!-- Event content -->
                    <div class="flex-1 min-w-0 pb-4">
                      <div class="bg-terminal-green/5 border border-terminal-green/20 rounded-lg p-4 
                                  group-hover:border-terminal-green/40 group-hover:bg-terminal-green/10 
                                  transition-all duration-200 ml-1">
                        
                        <!-- Event header -->
                        <div class="flex flex-wrap items-center justify-between mb-2">
                          <div class="flex items-center space-x-2">
                            <span class="text-lg">${getIcon(event.type)}</span>
                            <span class="text-xs px-2 py-1 rounded-full bg-terminal-green/20 ${getTypeColor(event.type)} font-semibold">
                              ${getTypeLabel(event.type)}
                            </span>
                            ${isOngoing ? '<span class="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold animate-pulse">CURRENT</span>' : ''}
                          </div>
                          <div class="text-xs text-white/70 font-mono">
                            ${duration}
                          </div>
                        </div>
                        
                        <!-- Event details -->
                        <div class="mb-2">
                          <h3 class="text-terminal-bright-green font-semibold text-sm mb-1">
                            ${event.title}
                          </h3>
                          ${event.subtitle ? `
                            <p class="text-terminal-yellow text-xs mb-1">
                              ${event.subtitle}
                            </p>
                          ` : ''}
                          ${event.description ? `
                            <p class="text-white/70 text-xs">
                              ${event.description}
                            </p>
                          ` : ''}
                        </div>
                        
                        <!-- Progress indicator for ongoing items -->
                        ${isOngoing ? `
                          <div class="mt-2">
                            <div class="h-1 bg-terminal-green/20 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-terminal-green to-terminal-bright-green 
                                          animate-pulse rounded-full"></div>
                            </div>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <!-- Timeline stats -->
            <div class="mt-8 border-t border-terminal-green/30 pt-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-terminal-bright-green font-bold text-lg">
                    ${portfolioData.cv.sections?.experience.length}
                  </div>
                  <div class="text-white/70 text-xs">Positions</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-blue-400 font-bold text-lg">
                    ${portfolioData.cv.sections?.education.length}
                  </div>
                  <div class="text-white/70 text-xs">Degrees</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-purple-400 font-bold text-lg">
                    ${portfolioData.cv.sections?.professional_projects.length + portfolioData.cv.sections?.personal_projects.length}
                  </div>
                  <div class="text-white/70 text-xs">Projects</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-yellow-400 font-bold text-lg">
                    ${portfolioData.cv.sections?.publication?.length || 0}
                  </div>
                  <div class="text-white/70 text-xs">Publications</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `.trim();

    // Add the entire timeline box as a single line
    addLine(timelineBox, 'w-full');
  }, [addLine, portfolioData]);

  const showSearch = useCallback((args: string[]) => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const searchTerm = args.join(' ').toLowerCase();
    if (!searchTerm) {
      const usageBox = `
        <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow">
          <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
            <span class="text-terminal-bright-green text-sm font-bold">SEARCH USAGE</span>
          </div>
          <div class="p-3 space-y-3 text-xs sm:text-sm">
            <div>
              <div class="text-terminal-yellow font-bold mb-2">📋 USAGE</div>
              <div class="ml-2 space-y-1">
                <div class="text-white bg-terminal-green/5 p-2 rounded">
                  <span class="text-terminal-bright-green font-semibold">search</span> <span class="text-terminal-yellow">[term]</span>
                </div>
              </div>
            </div>
            <div>
              <div class="text-terminal-yellow font-bold mb-2">💡 EXAMPLES</div>
              <div class="ml-2 space-y-1">
                <div class="text-white bg-terminal-green/5 p-2 rounded">
                  <span class="text-terminal-bright-green">search</span> python
                </div>
                <div class="text-white bg-terminal-green/5 p-2 rounded">
                  <span class="text-terminal-bright-green">search</span> react
                </div>
                <div class="text-white bg-terminal-green/5 p-2 rounded">
                  <span class="text-terminal-bright-green">search</span> machine learning
                </div>
              </div>
            </div>
          </div>
        </div>
      `.trim();
      
      addLine(usageBox, 'w-full');
      return;
    }

    const results: Array<{category: string, title: string, content: string}> = [];
    const { cv } = portfolioData;

    // Helper function to highlight search terms
    const highlightMatch = (text: string, term: string): string => {
      const regex = new RegExp(`(${term})`, 'gi');
      return text.replace(regex, '<span class="bg-terminal-yellow/30 text-terminal-bright-green font-semibold">$1</span>');
    };

    // Search in intro/about section
    cv.sections?.intro.forEach((intro, i) => {
      if (intro.toLowerCase().includes(searchTerm)) {
        results.push({
          category: 'About',
          title: `Introduction ${i + 1}`,
          content: highlightMatch(intro, searchTerm)
        });
      }
    });

    // Search in technologies/skills
    cv.sections?.technologies.forEach(tech => {
      if (tech.label.toLowerCase().includes(searchTerm) || tech.details.toLowerCase().includes(searchTerm)) {
        const matchedContent = [];
        if (tech.label.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Technology: ${highlightMatch(tech.label, searchTerm)}`);
        }
        if (tech.details.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Details: ${highlightMatch(tech.details, searchTerm)}`);
        }
        results.push({
          category: 'Skills',
          title: tech.label,
          content: matchedContent.join('<br>')
        });
      }
    });

    // Search in experience
    cv.sections?.experience.forEach(exp => {
      const matchedContent = [];
      
      if (exp.company.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Company: ${highlightMatch(exp.company, searchTerm)}`);
      }
      if (exp.position.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Position: ${highlightMatch(exp.position, searchTerm)}`);
      }
      if (exp.location.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Location: ${highlightMatch(exp.location, searchTerm)}`);
      }
      
      // Check highlights for matches
      exp.highlights.forEach((highlight, index) => {
        if (highlight.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Highlight ${index + 1}: ${highlightMatch(highlight, searchTerm)}`);
        }
      });
      
      if (matchedContent.length > 0) {
        results.push({
          category: 'Experience',
          title: `${exp.position} at ${exp.company}`,
          content: matchedContent.join('<br>')
        });
      }
    });

    // Search in education
    cv.sections?.education.forEach(edu => {
      const matchedContent = [];
      
      if (edu.institution.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Institution: ${highlightMatch(edu.institution, searchTerm)}`);
      }
      if (edu.degree.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Degree: ${highlightMatch(edu.degree, searchTerm)}`);
      }
      if (edu.area.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Major: ${highlightMatch(edu.area, searchTerm)}`);
      }
      if (edu.location?.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Location: ${highlightMatch(edu.location || "", searchTerm)}`);
      }
      
      // Check highlights for matches
      edu.highlights?.forEach((highlight, index) => {
        if (highlight.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Highlight ${index + 1}: ${highlightMatch(highlight, searchTerm)}`);
        }
      });
      
      if (matchedContent.length > 0) {
        results.push({
          category: 'Education',
          title: `${edu.degree} in ${edu.area} from ${edu.institution}`,
          content: matchedContent.join('<br>')
        });
      }
    });

    // Search in professional projects
    cv.sections?.professional_projects.forEach(proj => {
      const matchedContent = [];
      
      if (proj.name.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Project: ${highlightMatch(proj.name, searchTerm)}`);
      }
      
      // Check highlights for matches
      proj.highlights.forEach((highlight, index) => {
        if (highlight.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Detail ${index + 1}: ${highlightMatch(highlight, searchTerm)}`);
        }
      });
      
      if (matchedContent.length > 0) {
        results.push({
          category: 'Professional Projects',
          title: proj.name,
          content: matchedContent.join('<br>')
        });
      }
    });

    // Search in personal projects
    cv.sections?.personal_projects.forEach(proj => {
      const matchedContent = [];
      
      if (proj.name.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Project: ${highlightMatch(proj.name, searchTerm)}`);
      }
      
      // Check highlights for matches
      proj.highlights.forEach((highlight, index) => {
        if (highlight.toLowerCase().includes(searchTerm)) {
          matchedContent.push(`Detail ${index + 1}: ${highlightMatch(highlight, searchTerm)}`);
        }
      });
      
      if (matchedContent.length > 0) {
        results.push({
          category: 'Personal Projects',
          title: proj.name,
          content: matchedContent.join('<br>')
        });
      }
    });

    // Create the search results box
    const searchBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">SEARCH RESULTS</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div class="bg-terminal-green/5 p-2 rounded">
            <span class="text-terminal-yellow font-semibold">Search term:</span>
            <span class="text-white"> "${searchTerm}"</span>
          </div>
          <div class="bg-terminal-green/5 p-2 rounded">
            <span class="text-terminal-bright-green font-semibold">Found ${results.length} result(s)</span>
          </div>
          ${results.length === 0 ? `
            <div class="border border-terminal-yellow/30 rounded p-3 text-center">
              <div class="text-terminal-yellow font-semibold mb-2">No results found</div>
              <div class="text-white opacity-80 text-xs">
                Try searching for technologies, company names, or project keywords
              </div>
            </div>
          ` : `
            <div class="space-y-3">
              ${results.map((result, index) => `
                <div class="border border-terminal-green/20 rounded p-3 ${index < results.length - 1 ? 'border-b border-terminal-green/30' : ''}">
                  <div class="mb-2">
                    <span class="text-terminal-bright-green font-semibold text-xs">[${result.category.toUpperCase()}]</span>
                    <span class="text-terminal-yellow font-semibold ml-2">${result.title}</span>
                  </div>
                  <div class="text-white text-xs opacity-80 bg-terminal-green/5 p-2 rounded leading-relaxed">
                    ${result.content}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 EXPLORE MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> to see all technologies</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> to view work history</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to explore all projects</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=help" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">help</a></span> for all available commands</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire search box as a single line
    addLine(searchBox, 'w-full');
  }, [addLine, portfolioData, formatExperiencePeriod]);

  const showTheme = useCallback((args: string[]) => {
    const theme = args[0];

    if (!theme) {
      addLine('<span class="text-terminal-bright-green">Available Themes:</span>');
      addLine('');
      addLine('<span class="text-terminal-green">matrix</span>    - Classic green on black (default)');
      addLine('<span class="text-blue-400">blue</span>      - Blue cyberpunk theme');
      addLine('<span class="text-purple-400">purple</span>    - Purple hacker theme');
      addLine('<span class="text-orange-400">amber</span>     - Vintage amber terminal');
      addLine('<span class="text-red-400">red</span>       - Red alert theme');
      addLine('<span class="text-terminal-yellow">reset</span>     - Reset to default theme');
      addLine('');
      addLine('<span class="text-terminal-yellow">Usage: theme [name]</span>');
      return;
    }

    if (theme === 'reset') {
      storage.remove(storageConfig.keys.theme);
      addLine('<span class="text-terminal-yellow">Theme reset. Refreshing page...</span>');
      setTimeout(() => window.location.reload(), terminalConfig.animations.themeReloadDelay);
      return;
    }

    if (themes[theme]) {
      const selectedTheme = themes[theme];
      addLine(`<span style="color: ${selectedTheme['--terminal-green']}">Switching to ${selectedTheme.name} theme...</span>`);

      Object.keys(selectedTheme).forEach(key => {
        if (key !== 'name') {
          document.documentElement.style.setProperty(key, selectedTheme[key]);
        }
      });

      // Save the selected theme to localStorage for persistence
      storage.set(storageConfig.keys.theme, theme);

      setTimeout(() => {
        addLine(`<span style="color: ${selectedTheme['--terminal-green']}">Theme changed successfully!</span>`);
      }, 500);
    } else {
      addLine('<span class="text-terminal-red">Theme not found. Use "theme" to see available themes.</span>');
    }
  }, [addLine]);

  const showContact = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const { cv } = portfolioData;
    
    // Create the contact content as a single HTML string, matching showAbout and showExperience structure
    const contactBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">CONTACT INFORMATION</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">📞 PERSONAL DETAILS</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Name</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">${cv.name}</span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Location</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">${cv.location}</span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Email</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">${cv.email}</span>
                </div>
              </div>
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-3 bg-terminal-green/10">
                  <span class="text-terminal-yellow font-semibold">Phone</span>
                </div>
                <div class="col-span-9 bg-terminal-green/5">
                  <span class="text-white">
                    <a href="${cv.phone || ""}" class="text-terminal-bright-green hover:text-terminal-yellow cursor-pointer">
                      ${cv.phone?.replace(/[^\d\+]/g, '')}
                    </a>
                    </span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">🌐 SOCIAL NETWORKS</div>
            <div class="space-y-1 ml-2">
              ${cv.social_networks?.map(social => {
                const url = getSocialNetworkUrl(social.network, social.username);
                return `
                  <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-3 bg-terminal-green/10">
                      <span class="text-terminal-yellow font-semibold">${social.network}</span>
                    </div>
                    <div class="col-span-9 bg-terminal-green/5">
                      <span class="text-white">${url}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">{uiText.messages.info.connecting}</div>
            <div class="space-y-1 ml-2 text-xs">
              <div class="text-white leading-relaxed bg-terminal-green/5 p-2 rounded">
                Feel free to reach out for collaborations, opportunities, or just to connect!
              </div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=about" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">about</a></span> to learn more about me</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> to see my work</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> for my professional background</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire contact box as a single line
    addLine(contactBox, 'w-full');
  }, [addLine, portfolioData]);

  const showWhoAmI = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    addLine(`<span class="text-terminal-green">User:</span> <span class="text-white">${portfolioData.cv.name}</span>`);
    addLine(`<span class="text-terminal-green">Location:</span> <span class="text-white">${portfolioData.cv.location}</span>`);
    addLine(`<span class="text-terminal-green">Role:</span> <span class="text-white">${portfolioData.cv.sections?.experience[0]?.position || uiText.labels.professional}</span>`);
  }, [addLine, portfolioData]);

  const showCat = useCallback((args: string[]) => {
    const filename = args[0];
    if (!filename) {
      const usageBox = `
        <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
          <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
            <span class="text-terminal-bright-green text-sm font-bold">CAT COMMAND</span>
          </div>
          <div class="p-3 space-y-2 text-xs sm:text-sm">
            <div class="text-terminal-yellow font-semibold">Usage: cat [filename]</div>
            <div class="text-white">Available files: resume.txt</div>
          </div>
        </div>
      `.trim();
      
      addLine(usageBox, 'w-full');
      return;
    }

    if (filename === 'resume.txt') {
      if (!portfolioData) {
        addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
        return;
      }

      const { cv } = portfolioData;
      
      const resumeBox = `
        <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
          <div class="border-b border-terminal-green/30 px-3 py-1">
            <div class="flex items-center justify-between">
              <span class="text-terminal-bright-green text-sm font-bold">RESUME.TXT</span>
              <button 
                onclick="toggleAllCollapsibles('resume')" 
                class="text-xs px-2 py-1 border border-terminal-green/50 rounded hover:bg-terminal-green/10 transition-colors text-terminal-yellow"
                id="expand-all-btn"
              >
                Expand All
              </button>
            </div>
          </div>
          <div class="p-3 space-y-2 text-xs sm:text-sm font-mono">
            <!-- Personal Info - Always visible -->
            <div class="bg-terminal-green/5 p-3 rounded">
              <div class="text-terminal-yellow font-bold text-lg mb-1">${cv.name}</div>
              <div class="text-terminal-green">
                <span class="text-terminal-yellow">Location:</span> <span class="text-terminal-green">${cv.location}</span>
              </div>
              <div class="text-terminal-green">
                <span class="text-terminal-yellow">Email:</span> <span class="text-terminal-green">${cv.email}</span>
              </div>
              <div class="text-terminal-green">
                <span class="text-terminal-yellow">Phone:</span> <a href="${cv.phone || ""}" class="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer">
                  ${cv.phone?.replace(/[^\d\+]/g, '')}
                </a>
              </div>
              ${cv.social_networks?.length > 0 ? `
                <div class="text-terminal-green">
                  ${cv.social_networks?.map(social => `
                    <div><span class="text-terminal-yellow">${social.network}:</span> <span class="text-terminal-green">${getSocialNetworkUrl(social.network, social.username)}</span></div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            ${cv.sections?.intro?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 0)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">About</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 0)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 0)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-1">
                    ${cv.sections?.intro.map(line => `
                      <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                        ${line}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections?.technologies?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 1)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Technologies</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 1)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 1)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-1">
                    ${cv.sections?.technologies.map(tech => `
                      <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                        <span class="text-terminal-yellow font-semibold">• ${tech.label}</span>
                        <span class="text-white"> - ${tech.details}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections?.experience?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 2)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Experience</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 2)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 2)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections?.experience.map(exp => {
                      const endDate = exp.end_date || uiText.labels.present;
                      return `
                        <div class="bg-terminal-green/5 p-3 rounded">
                          <div class="mb-2">
                            <span class="text-terminal-yellow font-semibold">${exp.position}</span>
                            <span class="text-white"> @ </span>
                            <span class="text-terminal-green font-bold">${exp.company}</span>
                          </div>
                          <div class="text-terminal-green mb-2">${exp.location} | ${exp.start_date} - ${endDate}</div>
                          ${exp.highlights?.length > 0 ? `
                            <div class="space-y-1">
                              ${exp.highlights.map(highlight => `
                                <div class="text-white text-xs leading-relaxed bg-terminal-green/10 p-2 rounded">
                                  • ${highlight}
                                </div>
                              `).join('')}
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections?.education?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 3)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Education</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 3)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 3)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections?.education.map(edu => `
                      <div class="bg-terminal-green/5 p-3 rounded">
                        <div class="text-terminal-yellow font-semibold">${edu.degree} in ${edu.area} from ${edu.institution}</div>
                        <div class="text-terminal-green">${edu.location || ""}</div>
                        <div class="text-terminal-green">${edu.start_date} - ${edu.end_date}</div>
                        ${edu.highlights?.length > 0 ? `
                          <div class="space-y-1 mt-2">
                            ${edu.highlights?.map(highlight => `
                              <div class="text-white text-xs leading-relaxed bg-terminal-green/10 p-2 rounded">
                                • ${highlight}
                              </div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections?.professional_projects?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 4)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Professional Projects</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 4)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 4)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections?.professional_projects.map(project => `
                      <div class="bg-terminal-green/5 p-3 rounded">
                        <div class="mb-2">
                          <span class="text-terminal-yellow font-semibold">${project.name}</span>
                          <span class="text-terminal-green ml-2">(${project.date})</span>
                        </div>
                        ${project.highlights?.length > 0 ? `
                          <div class="space-y-1">
                            ${project.highlights.map(highlight => `
                              <div class="text-white text-xs leading-relaxed bg-terminal-green/10 p-2 rounded">
                                • ${highlight}
                              </div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections?.personal_projects?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 5)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Personal Projects</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 5)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 5)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections?.personal_projects.map(project => `
                      <div class="bg-terminal-green/5 p-3 rounded">
                        <div class="mb-2">
                          <span class="text-terminal-yellow font-semibold">${project.name}</span>
                          <span class="text-terminal-green ml-2">(${project.date})</span>
                        </div>
                        ${project.highlights?.length > 0 ? `
                          <div class="space-y-1">
                            ${project.highlights.map(highlight => `
                              <div class="text-white text-xs leading-relaxed bg-terminal-green/10 p-2 rounded">
                                • ${highlight}
                              </div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${(cv.sections?.publication?.length || 0) > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleCollapsible('${getCollapsibleId('resume', 6)}')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Publications</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="${getCollapsibleId('resume', 6)}-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="${getCollapsibleId('resume', 6)}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections.publication?.map(pub => `
                      <div class="bg-terminal-green/5 p-3 rounded">
                        <div class="text-terminal-yellow font-semibold mb-1">${pub.title}</div>
                        <div class="text-terminal-green">${pub.authors.join(', ')}</div>
                        <div class="text-terminal-green">${pub.journal} (${pub.date})</div>
                        ${pub.doi ? `<div class="text-terminal-green">DOI: ${pub.doi}</div>` : ''}
                      </div>
                    `).join('') || ''}
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="border-t border-terminal-green/30 pt-3">
              <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
              <div class="space-y-1 ml-2 text-xs">
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=about" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">about</a></span> for a formatted introduction</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">experience</a></span> for detailed work history</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">projects</a></span> for interactive project showcase</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills" class="hover:text-terminal-bright-green hover:underline transition-colors duration-200">skills</a></span> for technology breakdown</div>
              </div>
            </div>
          </div>
        </div>
      `.trim();
      
      addLine(resumeBox, 'w-full');
    } else {
      const errorBox = `
        <div class="border border-terminal-red/50 rounded-sm mb-4 terminal-glow max-w-4xl">
          <div class="border-b border-terminal-red/30 px-3 py-1 text-center">
            <span class="text-terminal-red text-sm font-bold">ERROR</span>
          </div>
          <div class="p-3 text-xs sm:text-sm">
            <span class="text-terminal-red">cat: ${filename}: No such file or directory</span>
          </div>
        </div>
      `.trim();
      
      addLine(errorBox, 'w-full');
    }
  }, [addLine, portfolioData]);

  const showNeofetchFallback = useCallback(() => {
    if (!portfolioData) {
      return;
    }

    const { name, email, phone, location, website, sections } = portfolioData.cv;

    // Build ASCII border
    const width = 60;
    const border = '─'.repeat(width);

    addLine('');
    addLine(`<span style="font-family: monospace !important;">┌${border}┐</span>`);

    // Name (centered and bold)
    const nameLine = name.toUpperCase();
    const nameSpacing = ' '.repeat(Math.max(0, Math.floor((width - nameLine.length) / 2)));
    addLine(`<span style="font-family: monospace !important;">│${nameSpacing}<span class="text-terminal-yellow font-bold">${nameLine}</span>${' '.repeat(width - nameLine.length - nameSpacing.length)}│</span>`);

    addLine(`<span style="font-family: monospace !important;">├${border}┤</span>`);

    // Contact info
    const addInfoLine = (label: string, value: string | undefined) => {
      if (value) {
        const line = `${label}: ${value}`;
        const padding = ' '.repeat(Math.max(0, width - line.length));
        addLine(`<span style="font-family: monospace !important;">│ <span class="text-terminal-green">${label}:</span> ${value}${padding}│</span>`);
      }
    };

    if (email) addInfoLine('Email', email);
    if (phone) addInfoLine('Phone', phone);
    if (location) addInfoLine('Location', location);
    if (website) addInfoLine('Website', website);

    addLine(`<span style="font-family: monospace !important;">├${border}┤</span>`);

    // Top skills (first 5)
    if (sections?.technologies && sections.technologies.length > 0) {
      const topSkills = sections.technologies.slice(0, 5).map(tech => tech.label).join(', ');
      const skillsLabel = 'Skills';
      const line = `${skillsLabel}: ${topSkills}`;
      const padding = ' '.repeat(Math.max(0, width - line.length));
      addLine(`<span style="font-family: monospace !important;">│ <span class="text-terminal-green">${skillsLabel}:</span> ${topSkills}${padding}│</span>`);
    }

    addLine(`<span style="font-family: monospace !important;">└${border}┘</span>`);
    addLine('');
    addLine('<span class="text-terminal-dim">💡 Tip: Create a custom banner by adding client/public/data/neofetch.txt</span>');
    addLine('');
  }, [addLine, portfolioData]);

  const showNeofetch = useCallback(async () => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    // Check screen size
    const isMobile = window.innerWidth < apiConfig.responsive.neofetchMobileBreakpoint;

    try {
      // Select file based on screen size
      const filePath = isMobile ? apiConfig.endpoints.neofetchSmall : apiConfig.endpoints.neofetch;

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status}`);
      }
      
      const neofetchContent = await response.text();
      
      // Split the content by lines and add each line
      const lines = neofetchContent.split('\n');

      lines.forEach(line => {
        // Wrap each line in monospace span if it's not empty
        if (line.trim() === '') {
          addLine('');
        } else {
          // Convert spaces to   for proper HTML display
          const htmlLine = line.replace(/ /g, ' ');
          addLine(`<span style="font-family: monospace !important;">${htmlLine}</span>`);
        }
      });
      
    } catch (error) {
      console.error('Error loading neofetch content:', error);
      // Fallback: Generate simple banner from resume data
      showNeofetchFallback();
    }
  }, [addLine, portfolioData]);

  const listCommands = useCallback(() => {
    addLine('<span class="text-terminal-yellow font-bold">Available commands:</span>');
    addLine('');
    const commands = getAllCommandNames();
    commands.forEach(cmd => {
      addLine(`<span class="text-terminal-green">${cmd}</span>`);
    });
  }, [addLine, getAllCommandNames]);

  const executeCommand = useCallback((command: string) => {
    if (!command.trim()) return;
    
    addLine(`guest@portfolio:~$ ${command}`, 'text-terminal-green font-bold', true);
    setCommandHistory(prev => [command, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    
    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();

    // Check if command is available (exists in registry and passes availability check)
    const availableCommandNames = getAllCommandNames();
    if (!availableCommandNames.includes(cmd)) {
      // Check if command exists in registry but is unavailable due to missing data
      const commandInRegistry = COMMAND_REGISTRY.find(c =>
        c.name === cmd || c.aliases?.includes(cmd)
      );

      if (commandInRegistry && commandInRegistry.isAvailable && !commandInRegistry.isAvailable(portfolioData)) {
        addLine(`Command '${cmd}' is not available (no data found)`, 'text-terminal-yellow');
        return;
      }

      // Command doesn't exist at all
      addLine(formatMessage(uiText.messages.error.commandNotFound, { cmd }), 'text-terminal-red');
      return;
    }

    switch (cmd) {
      case 'help':
        showHelp();
        break;
      case 'resume':
        openResumePdf();
        break;
      case 'welcome':
        showWelcomeMessage();
        break;
      case 'about':
        showAbout();
        break;
      case 'skills':
        showSkills();
        break;
      case 'experience':
        showExperience();
        break;
      case 'education':
        showEducation();
        break;
      case 'projects':
        showProjects();
        break;
      case 'personal':
        showPersonalProjects();
        break;
      case 'contact':
        showContact();
        break;
      case 'publications':
        showPublications();
        break;
      case 'timeline':
        showTimeline();
        break;
      case 'search':
        showSearch(args.slice(1));
        break;
      case 'theme':
        showTheme(args.slice(1));
        break;
      case 'whoami':
        showWhoAmI();
        break;
      case 'ls':
        listCommands();
        break;
      case 'pwd':
        addLine('/home/user/portfolio', 'text-white');
        break;
      case 'cat':
        showCat(args.slice(1));
        break;
      case 'neofetch':
        showNeofetch();
        break;
      case 'replicate':
      case 'clone':
      case 'fork':
        showReplicate();
        break;
      case 'clear':
        clearTerminal();
        break;
      default:
        // Check if this is a dynamic section command
        if (portfolioData?.cv?.sections) {
          const sections = portfolioData.cv.sections as Record<string, unknown[]>;
          if (cmd in sections && Array.isArray(sections[cmd]) && sections[cmd].length > 0) {
            showGenericSection(cmd, sections[cmd]);
            return;
          }
        }
        // Command not found
        addLine(formatMessage(uiText.messages.error.commandNotFound, { cmd }), 'text-terminal-red');
        addLine(`Type \`<a href="?cmd=help" class="hover:text-terminal-yellow hover:underline transition-colors duration-200">help</a>\` or click on a command above to get started.`, 'text-terminal-yellow');
    }
  }, [addLine, showHelp, openResumePdf, showWelcomeMessage, showAbout, showSkills, showExperience, showEducation, showProjects, showPersonalProjects, showContact, showPublications, showTimeline, showSearch, showTheme, showWhoAmI, listCommands, showCat, showNeofetch, showReplicate, clearTerminal, showGenericSection, portfolioData]);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return currentInput;

    let newIndex = historyIndex;
    
    if (direction === 'up') {
      newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : commandHistory.length - 1;
    } else {
      newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
    }
    
    setHistoryIndex(newIndex);
    
    if (newIndex === -1) {
      return '';
    } else {
      return commandHistory[commandHistory.length - 1 - newIndex];
    }
  }, [commandHistory, historyIndex, currentInput]);

  const getCommandSuggestions = useCallback((input: string) => {
    if (!input.trim()) return [];
    const commands = getAllCommandNames();
    const themeSubCommands = ['matrix', 'blue', 'purple', 'amber', 'red', 'reset']
    const subCommands = ['cat resume.txt', ...themeSubCommands.map(color => `theme ${color}`)];
    var matched = commands.filter(cmd => cmd.startsWith(input.toLowerCase()));
    if (matched.length === 0) {
      matched = subCommands.filter(cmd => cmd.startsWith(input.toLowerCase()));
    }
    return matched;
  }, [getAllCommandNames]);

  const getAllCommands = useCallback(() => {
    return getAllCommandNames();
  }, [getAllCommandNames]);

  return {
    lines,
    executeCommand,
    navigateHistory,
    getCommandSuggestions,
    getAllCommands,
    isTyping,
    currentInput,
    setCurrentInput,
    clearTerminal,
    showWelcomeMessage,
  };
}