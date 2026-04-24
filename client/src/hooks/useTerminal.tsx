import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { type PortfolioData } from '../../../shared/schema';
import { formatExperiencePeriod, getSocialNetworkUrl } from '../lib/portfolioData';
import { themes } from '../lib/themes';
import { colorThemes, applyColorTheme, cycleTheme } from '../config/gui-theme.config';
import { uiText, formatMessage, apiConfig, terminalConfig, derivePromptUser, storage, storageConfig } from '../config';
import { renderCustomFields } from '../lib/fieldRenderer';
import { Block } from '../components/tui/Block';
import { SectionBox } from '../components/tui/SectionBox';
import { CmdLink, ExtLink } from '../components/tui/TuiLink';
import { UsageHint } from '../components/tui/UsageHint';
import { ExploreMore } from '../components/tui/ExploreMore';
import { CollapsibleGroup, type CollapsibleItemData } from '../components/tui/Collapsible';
import { ReplicatePage } from '../components/tui/ReplicatePage';
import { LabeledRow, CompactRow } from '../components/tui/LabeledRow';
import { MarkdownBlock } from '../components/tui/MarkdownBlock';
import { BrailleSparkline, formatCompact } from '../components/tui/BrailleSparkline';
import type { TerminalLinkRegistry, TerminalLink } from '../components/tui/LinkRegistry';
import { loadPyPIStats, type PyPIStatsData, type PyPIPackageStats } from '../lib/pypiStats';
// Import specific date-fns functions for better tree-shaking
import { parse } from 'date-fns/parse';

export interface TerminalLine {
  id: string;
  /** Plain-text strings are rendered via React's default escaping;
      ReactNode content is rendered directly. No HTML strings reach
      the DOM anymore — every command emits JSX. */
  content: string | ReactNode;
  className?: string;
  isCommand?: boolean;
}

export interface UseTerminalProps {
  portfolioData: PortfolioData | null;
  onSwitchToGUI?: () => void;
  /** Called by the `matrix` command to trigger the idle-rain overlay
   *  on demand. Terminal.tsx wires this to setMatrixActive(true). */
  onTriggerMatrix?: () => void;
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

/** Synthesise a demo PyPI stats payload so the `stats` command always
 *  has something to render when the real `pypi-stats.json` is missing
 *  (template clones, pre-deploy, offline dev). Values are obviously
 *  fake — the UI flags this with a "· demo data" tag. */
function buildDemoPypi(): PyPIStatsData {
  const today = new Date();
  const weeklyFor = (baseDownloads: number, jitter: number, weeks = 16) =>
    Array.from({ length: weeks }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (weeks - i) * 7);
      const phase = Math.sin((i / weeks) * Math.PI * 2.2);
      const noise = (Math.random() - 0.5) * jitter;
      const value = Math.max(0, Math.round(baseDownloads * (1 + 0.35 * phase) + noise));
      return { date: d.toISOString().slice(0, 10), downloads: value };
    });

  const demoPackages: Record<string, PyPIPackageStats> = {
    quickstart: {
      name: 'quickstart',
      total_all_time: 32100,
      total_180d: 9200,
      last_day: 220,
      last_week: 1480,
      last_month: 5400,
      daily: [],
      weekly: weeklyFor(1200, 600),
    },
    sqlstream: {
      name: 'sqlstream',
      total_all_time: 5200,
      total_180d: 1800,
      last_day: 42,
      last_week: 290,
      last_month: 980,
      daily: [],
      weekly: weeklyFor(260, 140),
    },
    'smart-commit': {
      name: 'smart-commit',
      total_all_time: 3400,
      total_180d: 1100,
      last_day: 18,
      last_week: 160,
      last_month: 520,
      daily: [],
      weekly: weeklyFor(140, 90),
    },
  };
  const total = Object.values(demoPackages).reduce(
    (s, p) => s + p.total_all_time,
    0,
  );
  return {
    fetched_at: today.toISOString(),
    total_downloads: total,
    packages: demoPackages,
  };
}

function getProjectsNode(
  projectData: Array<Record<string, unknown>>,
  type: string,
): ReactNode {
  const items: CollapsibleItemData[] = projectData.map((project, index) => ({
    id: `${type}-${index}`,
    header: (
      <>
        <span className="text-terminal-yellow font-semibold">
          {project.name as string}
        </span>
        <span className="text-white opacity-60 text-xs ml-2">
          {project.date as string}
        </span>
      </>
    ),
    content: (
      <>
        <div className="space-y-1">
          {((project.highlights as string[]) || []).map((highlight, i) => (
            <div
              key={i}
              className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3 flex gap-2"
            >
              <span className="text-tui-accent-dim shrink-0">·</span>
              <div className="flex-1">
                <MarkdownBlock source={highlight} inline />
              </div>
            </div>
          ))}
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: renderCustomFields(project, 'projects'),
          }}
        />
      </>
    ),
  }));

  return (
    <CollapsibleGroup
      title={`${type.toUpperCase()} PROJECTS`}
      items={items}
      footer={
        <div className="mt-4">
          <ExploreMore
            items={[
              { cmd: 'experience', suffix: 'to see my professional background' },
              { cmd: 'skills', suffix: "to see technologies I've mastered" },
              { cmd: 'timeline', suffix: 'for a chronological career overview' },
            ]}
          />
        </div>
      }
    />
  );
}

async function getWelcomeNode(portfolioData: PortfolioData): Promise<ReactNode> {
  const sanitizedPhone = portfolioData.cv.phone?.replace(/[^\d+]/g, '') || '';
  const filePath = apiConfig.endpoints.styledName;

  const response = await fetch(filePath);
  let styledName = '';
  if (response.ok) styledName = await response.text();
  if (
    !styledName ||
    styledName.trim() === '' ||
    styledName.startsWith('<!DOCTYPE html>')
  ) {
    styledName = '';
  }
  const usePre = styledName.trim() !== '';

  const cv = portfolioData.cv;
  const firstRole = cv.sections?.experience?.[0]?.position ?? '';
  const introParagraph = cv.sections?.intro?.[0] ?? '';

  const QuickCmd = ({ cmd, label }: { cmd: string; label: string }) => (
    <div className="flex items-center space-x-2">
      <span className="text-terminal-bright-green">→</span>
      <CmdLink cmd={cmd} className="text-terminal-yellow">
        {cmd}
      </CmdLink>
      <span className="text-white/80">{label}</span>
    </div>
  );

  return (
    <div className="mb-4 sm:mb-6">
      <div className="mb-3 sm:mb-4">
        {usePre ? (
          <>
            <div className="hidden sm:block border border-terminal-green/30 rounded-sm px-4 py-2 max-w-4xl overflow-x-auto">
              <pre className="text-terminal-bright-green text-xs leading-tight">
                {styledName}
              </pre>
            </div>
            <div className="sm:hidden text-terminal-bright-green text-center mb-3">
              <div className="text-lg font-bold">{cv.name.toUpperCase()}</div>
              <div className="text-sm">TERMINAL PORTFOLIO</div>
            </div>
          </>
        ) : (
          <div className="text-terminal-bright-green text-center mb-3">
            <div className="text-lg font-bold">{cv.name.toUpperCase()}</div>
            <div className="text-sm">TERMINAL PORTFOLIO</div>
          </div>
        )}
      </div>
      <div className="mb-4">
        <p className="text-terminal-green mb-2 text-sm sm:text-base">{uiText.welcome.greeting}</p>
        <div className="text-white/80 mb-2 text-xs sm:text-sm leading-relaxed">
          <MarkdownBlock source={introParagraph} inline />
        </div>
      </div>

      <SectionBox
        title="// overview"
        bodyClassName="p-3 space-y-1 text-xs sm:text-sm"
        className="max-w-none"
      >
        <CompactRow label="USER" value={cv.name} />
        <CompactRow label="ROLE" value={firstRole} />
        <CompactRow label="LOC" value={cv.location ?? ''} />
        {cv.website && (
          <CompactRow
            label="WEB"
            value={<ExtLink href={cv.website}>{cv.website.replace(/^https?:\/\//, '')}</ExtLink>}
          />
        )}
        <CompactRow
          label="EMAIL"
          value={<ExtLink href={`mailto:${cv.email}`}>{cv.email}</ExtLink>}
        />
        {cv.resume_url && (
          <CompactRow
            label="RESUME"
            value={<ExtLink href={cv.resume_url}>resume.pdf</ExtLink>}
          />
        )}
        {sanitizedPhone && (
          <CompactRow
            label="PHONE"
            value={<ExtLink href={`tel:${sanitizedPhone}`}>{sanitizedPhone}</ExtLink>}
          />
        )}
      </SectionBox>

      <div className="mb-4">
        <p className="text-tui-accent-dim mb-2 text-xs sm:text-sm">
          // quick tiles
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
          <QuickCmd cmd="about" label="background" />
          <QuickCmd cmd="skills" label="technical expertise" />
          <QuickCmd cmd="experience" label="work history" />
          <QuickCmd cmd="projects" label="professional work" />
          <QuickCmd cmd="personal" label="personal projects" />
          <QuickCmd cmd="contact" label="get in touch" />
        </div>
      </div>

      <div className="text-xs space-y-1 text-tui-muted">
        <div>
          type{' '}
          <CmdLink cmd="help">help</CmdLink>{' '}
          for all commands
        </div>
        <div className="text-tui-muted/70">
          like this portfolio? type{' '}
          <CmdLink cmd="replicate" className="text-tui-muted">
            replicate
          </CmdLink>{' '}
          to fork it in ~5 min
        </div>
      </div>
    </div>
  );
}

// Command Registry Types and Definitions
export interface CommandMetadata {
  name: string;
  description: string;
  category: 'information' | 'professional' | 'contact' | 'tools' | 'terminal' | 'hidden';
  /**
   * Function to check if command should be available based on portfolio data
   * Returns true if command should be shown, false to hide it
   */
  isAvailable?: (data: PortfolioData | null) => boolean;
  /** Command aliases */
  aliases?: string[];
  /** Hint for argument completion, e.g. `[term]` or `[theme-name]`. */
  argsHint?: string;
  /** Hidden commands appear in autocomplete but not in `help`. */
  hidden?: boolean;
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
    isAvailable: (data) => !!data?.cv.sections?.publication && data.cv.sections?.publication.length > 0
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
  { name: 'search', description: 'Search through my portfolio content', category: 'tools', argsHint: '[term]' },
  { name: 'theme', description: 'Change terminal color theme', category: 'tools', argsHint: '[name]' },
  { name: 'gui', description: 'Switch to the GUI portfolio view', category: 'tools' },
  { name: 'replicate', description: 'Create your own terminal portfolio', category: 'tools', aliases: ['clone', 'fork'] },
  { name: 'stats', description: 'Live PyPI download sparklines', category: 'tools' },

  // TERMINAL Commands (always available)
  { name: 'clear', description: 'Clear the terminal screen', category: 'terminal' },
  { name: 'history', description: 'Show recent commands (click to re-run)', category: 'terminal' },
  { name: 'ls', description: 'List available commands', category: 'terminal' },
  { name: 'pwd', description: 'Print working directory', category: 'terminal' },
  { name: 'cat', description: 'Display file contents', category: 'terminal', argsHint: '[file]' },

  // HIDDEN Commands — autocomplete-discoverable, absent from `help`.
  // Rewards for the curious; mirrors the GUI's select-to-reveal +
  // long-press easter eggs.
  { name: 'quote', description: 'Print a short quote', category: 'hidden', hidden: true },
  { name: 'coffee', description: 'Brew a caffeinated ascii cup', category: 'hidden', hidden: true },
  { name: 'sudo', description: 'A pleasant refusal', category: 'hidden', hidden: true, argsHint: '<anything>' },
  { name: 'matrix', description: 'Trigger the idle screensaver on demand', category: 'hidden', hidden: true },
  { name: 'konami', description: 'Cycle color theme with a flash', category: 'hidden', hidden: true },
  { name: 'rm', description: 'Tread carefully', category: 'hidden', hidden: true, argsHint: '-rf /' },
  // `o N` / `g N` — vim-motion link open. The handler reads the
  // argument number and opens the corresponding registered link.
  { name: 'open', description: 'Open link by number', category: 'tools', hidden: true, aliases: ['o', 'g'], argsHint: '<N>' },
];

export function useTerminal({ portfolioData, onSwitchToGUI, onTriggerMatrix }: UseTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    // Rehydrate from localStorage so the history command + arrow-key
    // recall survive a page reload.
    const stored = storage.getJSON<string[]>(storageConfig.keys.commandHistory);
    return Array.isArray(stored) ? stored : [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  /** Current pseudo-directory — Starship-style prompt context. Reset
   *  on `clear`; advanced by destination commands (about → ~/about).
   *  Non-destination commands (theme, ls, history, search) leave it. */
  const [currentDir, setCurrentDir] = useState('~');
  /** Exit code of the most recent command. 0 = success, 127 = not
   *  found, 1 = handler failed, null = no commands run yet. */
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);
  const lineIdCounter = useRef(0);

  // Terminal-wide numbered link registry. Consumed by NumberedLink for
  // display, by Terminal.tsx for `o N` / `g N` resolution. Resets on
  // `clear`. Numbers are href-keyed and stable across re-renders.
  const linkCounter = useRef(0);
  const linkMap = useRef<Map<number, TerminalLink>>(new Map());
  const linkHrefIndex = useRef<Map<string, number>>(new Map());

  const linkRegistry = useMemo<TerminalLinkRegistry>(
    () => ({
      register: (href: string, label: string) => {
        const existing = linkHrefIndex.current.get(href);
        if (existing !== undefined) return existing;
        const n = ++linkCounter.current;
        linkMap.current.set(n, { n, href, label });
        linkHrefIndex.current.set(href, n);
        return n;
      },
      resolve: (n: number) => linkMap.current.get(n),
      all: () => Array.from(linkMap.current.values()),
      reset: () => {
        linkCounter.current = 0;
        linkMap.current.clear();
        linkHrefIndex.current.clear();
      },
    }),
    [],
  );

  const generateId = () => `line-${++lineIdCounter.current}`;

  // Cap scrollback so the DOM doesn't grow unbounded on long sessions.
  // 500 lines is ~30 screens of output — well beyond typical use.
  const SCROLLBACK_CAP = 500;

  const addLine = useCallback((content: string, className?: string, isCommand = false) => {
    setLines(prev => {
      const next = [...prev, { id: generateId(), content, className, isCommand }];
      return next.length > SCROLLBACK_CAP ? next.slice(-SCROLLBACK_CAP) : next;
    });
  }, []);

  /** Append a ReactNode line. React escapes everything by default; any
      legacy HTML rendering happens via scoped `dangerouslySetInnerHTML`
      inside individual command nodes, with trusted CV data as input. */
  const addNode = useCallback((content: ReactNode, className?: string) => {
    setLines(prev => {
      const next = [...prev, { id: generateId(), content, className }];
      return next.length > SCROLLBACK_CAP ? next.slice(-SCROLLBACK_CAP) : next;
    });
  }, []);

  // Persist command history to localStorage whenever it changes so the
  // `history` command + arrow-key recall work across page reloads.
  useEffect(() => {
    storage.setJSON(storageConfig.keys.commandHistory, commandHistory);
  }, [commandHistory]);


  const clearTerminal = useCallback(() => {
    setLines([]);
    setCurrentDir('~');
    linkRegistry.reset();
  }, [linkRegistry]);

  /** Commands that represent a "navigation" — they change the prompt
   *  context to `~/<cmd>`. Utility commands (ls, pwd, history, theme,
   *  search, clear, gui, resume, help) don't move the user anywhere.
   *  `welcome` resets to `~/` since that's the landing state. */
  const DESTINATION_COMMANDS = new Set([
    'about', 'skills', 'experience', 'education', 'projects',
    'personal', 'publications', 'timeline', 'contact', 'whoami',
    'neofetch', 'replicate', 'clone', 'fork', 'stats',
  ]);

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
      const node = await getWelcomeNode(portfolioData);
      addNode(node, 'welcome-message');
    }
  }, [addNode, portfolioData]);

  const showHelp = useCallback(() => {
    const availableCommands = getAvailableCommands();
    const commandsByCategory: Record<string, CommandMetadata[]> = {
      information: [],
      professional: [],
      contact: [],
      tools: [],
      terminal: [],
    };
    availableCommands.forEach((cmd) => {
      // Hidden commands are discoverable via autocomplete only.
      if (cmd.hidden) return;
      if (commandsByCategory[cmd.category]) {
        commandsByCategory[cmd.category].push(cmd);
      }
    });

    const categoryConfig = {
      information: { label: 'information' },
      professional: { label: 'professional' },
      contact: { label: 'contact' },
      tools: { label: 'tools' },
      terminal: { label: 'terminal' },
    } as const;

    const CommandRow = ({ cmd }: { cmd: CommandMetadata }) => {
      const showArgs = ['search', 'theme', 'cat'].includes(cmd.name);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <div className="sm:col-span-3 bg-terminal-green/10 px-1 sm:px-0">
            <CmdLink cmd={cmd.name} className="text-terminal-yellow">
              {cmd.name}
            </CmdLink>
            {showArgs && <span className="text-white"> [...]</span>}
            {cmd.aliases?.length ? (
              <span className="text-terminal-green/70 text-[10px]">
                {' '}
                ({cmd.aliases.join(', ')})
              </span>
            ) : null}
          </div>
          <div className="sm:col-span-9 bg-terminal-green/5 px-1 sm:px-0">
            <span className="text-white">{cmd.description}</span>
          </div>
        </div>
      );
    };

    const Category = ({ cat }: { cat: keyof typeof categoryConfig }) => {
      const cmds = commandsByCategory[cat];
      if (!cmds.length) return null;
      const { label } = categoryConfig[cat];
      return (
        <div>
          <div className="text-tui-accent-dim text-xs mb-2">
            // {label}
          </div>
          <div className="space-y-1 ml-2">
            {cmds.map((cmd) => (
              <CommandRow key={cmd.name} cmd={cmd} />
            ))}
          </div>
        </div>
      );
    };

    addNode(
      <SectionBox
        title="// help"
        centerTitle
        bodyClassName="p-3 space-y-3 text-xs sm:text-sm"
      >
        <Category cat="information" />
        <Category cat="professional" />
        <Category cat="contact" />
        <Category cat="tools" />
        <Category cat="terminal" />
        <div className="border-t border-tui-accent-dim/30 pt-3">
          <div className="text-tui-accent-dim text-xs mb-2">// tips</div>
          <div className="space-y-0.5 ml-1 text-xs text-white/80">
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">tab</span> for auto-completion
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">↑↓</span> to navigate command history
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">ctrl+c</span> to clear input
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">ctrl+l</span> to clear screen
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              click anywhere to focus input
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">o N</span> or{' '}
              <span className="text-terminal-bright-green font-mono">g N</span> to open link{' '}
              <span className="text-tui-muted">[N]</span>
            </div>
            <div>
              <span className="text-tui-accent-dim">· </span>
              <span className="text-terminal-bright-green font-mono">ctrl+k</span> opens the command palette
            </div>
          </div>
        </div>
        <div className="text-white/70 pt-2 border-t border-tui-accent-dim/30 text-xs">
          start with <CmdLink cmd="about">about</CmdLink>{' '}
          — or try <CmdLink cmd="neofetch">neofetch</CmdLink> for a quick overview.
        </div>
      </SectionBox>,
      'w-full',
    );
  }, [addNode, getAvailableCommands]);

  const openResumePdf = useCallback(() => {
    if (portfolioData) {
      const resumeUrl = portfolioData.cv.resume_url;
      if (resumeUrl) {
        window.open(resumeUrl, '_blank');
        addLine(`Opened ${resumeUrl} in a new tab.`, 'text-terminal-green');
      } else {
        addLine(uiText.messages.error.resumeNotFound, 'text-terminal-red');
      }
    } else {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
    }
  }, [portfolioData]);

  const showReplicate = useCallback(() => {
    addNode(<ReplicatePage />, 'w-full');
  }, [addNode]);

  const showAbout = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }
    const { cv } = portfolioData;
    const gh = getUsername(portfolioData, 'GitHub');
    const li = getUsername(portfolioData, 'LinkedIn');

    addNode(
      <SectionBox
        title="// about"
        bodyClassName="p-3 space-y-3 text-xs sm:text-sm"
      >
        <div>
          <div className="text-tui-accent-dim text-xs mb-2">// intro</div>
          <div className="space-y-2 ml-1">
            {(cv.sections?.intro ?? []).map((paragraph, i) => (
              <div key={i} className="border-l-2 border-tui-accent-dim/40 pl-3">
                <MarkdownBlock source={paragraph} inline />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-tui-accent-dim text-xs mb-2">// links</div>
          <div className="space-y-1 ml-1">
            {cv.website ? (
              <LabeledRow label="Portfolio">
                <ExtLink href={cv.website}>
                  {cv.website.replace('https://', '').trim()}
                </ExtLink>{' '}
                <span className="text-tui-muted">(you are here)</span>
              </LabeledRow>
            ) : null}
            <LabeledRow label="Email">
              <ExtLink href={`mailto:${cv.email}`}>{cv.email}</ExtLink>
            </LabeledRow>
            {gh && (
              <LabeledRow label="GitHub">
                <ExtLink href={`https://github.com/${gh}`}>{gh}</ExtLink>
              </LabeledRow>
            )}
            {li && (
              <LabeledRow label="LinkedIn">
                <ExtLink href={`https://linkedin.com/in/${li}`}>{li}</ExtLink>
              </LabeledRow>
            )}
          </div>
        </div>
        <ExploreMore
          items={[
            { cmd: 'contact', label: 'contact', suffix: 'for all my social links' },
            { cmd: 'skills', label: 'skills', suffix: 'to see my technical expertise' },
            { cmd: 'experience', label: 'experience', suffix: 'to view my work history' },
            { cmd: 'projects', label: 'projects', suffix: 'to explore my work' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  /**
   * Generic section renderer for dynamic sections (e.g., certifications, awards, volunteer_work)
   * Automatically detects entry type and renders accordingly
   */
  const showGenericSection = useCallback((sectionName: string, sectionData: unknown[]) => {
    if (!portfolioData || !sectionData || sectionData.length === 0) {
      addLine(`No data available for section: ${sectionName}`, 'text-terminal-yellow');
      return;
    }
    const displayTitle = sectionName.replace(/_/g, ' ').toUpperCase();

    const Highlights = ({
      items,
      label,
    }: {
      items: string[];
      label?: string;
    }) => (
      <div className="ml-2">
        {label && (
          <div className="text-tui-accent-dim text-xs mb-2">// {label.replace(/:/g, '').toLowerCase()}</div>
        )}
        <div className="space-y-1">
          {items.map((h, hi) => (
            <div
              key={hi}
              className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3 flex gap-2"
            >
              <span className="text-tui-accent-dim shrink-0">·</span>
              <div className="flex-1">
                <MarkdownBlock source={h} inline />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    const renderEntry = (entry: unknown, index: number) => {
      const isLast = index === sectionData.length - 1;
      const baseCls = `pb-4 ${isLast ? '' : 'border-b border-terminal-green/20'}`;

      if (typeof entry === 'string') {
        return (
          <div key={index} className={`pb-2 ${isLast ? '' : 'border-b border-terminal-green/20'}`}>
            <div className="text-white text-xs">{entry}</div>
          </div>
        );
      }

      const item = entry as Record<string, unknown>;
      const highlights = Array.isArray(item.highlights) ? (item.highlights as string[]) : [];

      if ('company' in item && 'position' in item) {
        const period = formatExperiencePeriod(
          item.start_date as string,
          item.end_date as string | undefined,
        );
        return (
          <div key={index} className={baseCls}>
            <div className="mb-3">
              <div className="bg-terminal-green/5 p-2 rounded mb-2">
                <span className="text-terminal-yellow font-semibold">{item.position as string}</span>
                <span className="text-white"> @ </span>
                <span className="text-terminal-bright-green font-bold">{item.company as string}</span>
              </div>
              <div className="ml-2">
                <span className="text-white opacity-80 text-xs">
                  {item.location ? `${item.location} | ${period}` : period}
                </span>
              </div>
            </div>
            {highlights.length > 0 && <Highlights items={highlights} label="Key Achievements:" />}
            <span
              dangerouslySetInnerHTML={{ __html: renderCustomFields(item, 'experience') }}
            />
          </div>
        );
      }
      if ('institution' in item && 'area' in item) {
        return (
          <div key={index} className={baseCls}>
            <div className="mb-3">
              <div className="bg-terminal-green/5 p-2 rounded mb-2">
                <span className="text-terminal-bright-green font-bold">{item.institution as string}</span>
              </div>
              <div className="ml-2 space-y-1">
                <div>
                  <span className="text-terminal-yellow font-semibold">
                    {(item.degree as string) || ''} {item.area as string}
                  </span>
                </div>
                {item.start_date ? (
                  <div className="text-white opacity-80 text-xs">
                    {item.start_date as string} - {(item.end_date as string) || 'Present'}
                  </div>
                ) : null}
              </div>
            </div>
            {highlights.length > 0 && <Highlights items={highlights} />}
            <span
              dangerouslySetInnerHTML={{ __html: renderCustomFields(item, 'education') }}
            />
          </div>
        );
      }
      if ('name' in item) {
        return (
          <div key={index} className={baseCls}>
            <div className="mb-3">
              <div className="bg-terminal-green/5 p-2 rounded mb-2">
                <span className="text-terminal-bright-green font-bold">{item.name as string}</span>
                {item.date ? (
                  <span className="text-white opacity-60 text-xs ml-2">({item.date as string})</span>
                ) : null}
              </div>
            </div>
            {highlights.length > 0 && <Highlights items={highlights} />}
            <span
              dangerouslySetInnerHTML={{ __html: renderCustomFields(item, 'projects') }}
            />
          </div>
        );
      }
      if ('label' in item && 'details' in item) {
        return (
          <div key={index} className={`pb-2 ${isLast ? '' : 'border-b border-terminal-green/20'}`}>
            <div className="flex gap-2">
              <span className="text-tui-accent-dim font-semibold min-w-[100px]">
                {item.label as string}:
              </span>
              <span className="text-white/90">
                <MarkdownBlock source={item.details as string} inline />
              </span>
            </div>
            <span
              dangerouslySetInnerHTML={{ __html: renderCustomFields(item, 'technologies') }}
            />
          </div>
        );
      }
      // Unknown entry — render JSON for debugging
      return (
        <div key={index} className={`pb-2 ${isLast ? '' : 'border-b border-terminal-green/20'}`}>
          <div className="text-white text-xs font-mono bg-terminal-green/5 p-2 rounded whitespace-pre">
            {JSON.stringify(item, null, 2)}
          </div>
        </div>
      );
    };

    addNode(
      <SectionBox
        title={displayTitle}
        centerTitle
        bodyClassName="p-3 space-y-4 text-xs sm:text-sm"
      >
        {sectionData.map(renderEntry)}
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showSkills = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }
    const techs = portfolioData.cv.sections?.technologies ?? [];
    addNode(
      <SectionBox
        title="// skills"
        centerTitle
        bodyClassName="p-3 space-y-3 text-xs sm:text-sm"
      >
        <div className="space-y-1 ml-2">
          {techs.map((tech, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2">
              <div className="md:col-span-3">
                <span className="text-tui-accent-dim font-semibold">{tech.label}</span>
              </div>
              <div className="md:col-span-9 border-l-2 border-tui-accent-dim/40 pl-3">
                <MarkdownBlock source={tech.details} inline />
              </div>
            </div>
          ))}
        </div>
        <ExploreMore
          items={[
            { cmd: 'projects', label: 'projects', suffix: 'to see these skills in action' },
            {
              cmd: 'experience',
              label: 'experience',
              suffix: "to see how I've applied them professionally",
            },
            { cmd: 'personal', label: 'personal', suffix: 'to explore my open source contributions' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showExperience = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }
    const jobs = portfolioData.cv.sections?.experience ?? [];
    addNode(
      <SectionBox
        title="// experience"
        centerTitle
        bodyClassName="p-3 space-y-4 text-xs sm:text-sm"
      >
        {jobs.map((job, index) => {
          const period = formatExperiencePeriod(job.start_date, job.end_date);
          const isLast = index === jobs.length - 1;
          return (
            <div
              key={`${job.company}-${index}`}
              className={`pb-4 ${isLast ? '' : 'border-b border-terminal-green/20'}`}
            >
              <div className="mb-3">
                <div className="bg-terminal-green/5 p-2 rounded mb-2">
                  <span className="text-terminal-yellow font-semibold">{job.position}</span>
                  <span className="text-white"> @ </span>
                  <span className="text-terminal-bright-green font-bold">{job.company}</span>
                </div>
                <div className="ml-2">
                  <span className="text-white opacity-80 text-xs">
                    {job.location} | {period}
                  </span>
                </div>
              </div>
              <div className="ml-2">
                <div className="text-tui-accent-dim text-xs mb-2">
                  // highlights
                </div>
                <div className="space-y-1">
                  {job.highlights.map((highlight, hi) => (
                    <div
                      key={hi}
                      className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3 flex gap-2"
                    >
                      <span className="text-tui-accent-dim shrink-0">·</span>
                      <div className="flex-1">
                        <MarkdownBlock source={highlight} inline />
                      </div>
                    </div>
                  ))}
                </div>
                <span
                  dangerouslySetInnerHTML={{ __html: renderCustomFields(job, 'experience') }}
                />
              </div>
            </div>
          );
        })}
        <ExploreMore
          items={[
            { cmd: 'projects', suffix: 'to see specific work examples' },
            { cmd: 'skills', suffix: "to see technologies I've mastered" },
            { cmd: 'timeline', suffix: 'for a chronological career overview' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showEducation = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const edus = portfolioData.cv.sections?.education ?? [];
    addNode(
      <SectionBox
        title="// education"
        centerTitle
        bodyClassName="p-3 space-y-4 text-xs sm:text-sm"
      >
        {edus.map((edu, index) => {
          const period = `${edu.start_date} - ${edu.end_date || 'Present'}`;
          const isLast = index === edus.length - 1;
          return (
            <div
              key={`${edu.institution}-${index}`}
              className={`pb-4 ${isLast ? '' : 'border-b border-terminal-green/20'}`}
            >
              <div className="mb-3">
                <div className="bg-terminal-green/5 p-2 rounded mb-2">
                  <span className="text-terminal-yellow font-semibold">
                    {edu.degree} in {edu.area}
                  </span>
                  <span className="text-white"> from </span>
                  <span className="text-terminal-bright-green font-bold">{edu.institution}</span>
                </div>
                <div className="ml-2">
                  <span className="text-white opacity-80 text-xs">
                    {edu.location || ''} | {period}
                  </span>
                </div>
              </div>
              {edu.highlights && edu.highlights.length > 0 && (
                <div className="ml-2">
                  <div className="text-terminal-bright-green font-semibold mb-2 text-xs">
                    Highlights:
                  </div>
                  <div className="space-y-1">
                    {edu.highlights.map((highlight, hi) => (
                      <div
                        key={hi}
                        className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3 flex gap-2"
                      >
                        <span className="text-tui-accent-dim shrink-0">·</span>
                        <div className="flex-1">
                          <MarkdownBlock source={highlight} inline />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div
                className="ml-2"
                dangerouslySetInnerHTML={{ __html: renderCustomFields(edu, 'education') }}
              />
            </div>
          );
        })}
        <ExploreMore
          items={[
            { cmd: 'experience', suffix: 'to see my professional background' },
            { cmd: 'skills', suffix: "to see technologies I've mastered" },
            { cmd: 'projects', suffix: 'to see specific work examples' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showProjects = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    if (!portfolioData?.cv.sections?.professional_projects || portfolioData.cv.sections.professional_projects.length === 0) {
      addLine(uiText.messages.error.noProfessionalProjects, 'text-terminal-red');
      return;
    }

    addNode(
      getProjectsNode(portfolioData.cv.sections.professional_projects, 'professional'),
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showPersonalProjects = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    if (!portfolioData?.cv.sections?.personal_projects || portfolioData.cv.sections.personal_projects.length === 0) {
      addLine(uiText.messages.error.noPersonalProjects, 'text-terminal-red');
      return;
    }

    addNode(
      getProjectsNode(portfolioData.cv.sections.personal_projects, 'personal'),
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showPublications = useCallback(() => {
    if (!portfolioData?.cv.sections?.publication || portfolioData.cv.sections.publication.length === 0) {
      addLine(uiText.messages.error.noPublications, 'text-terminal-red');
      return;
    }

    const publications = portfolioData.cv.sections.publication;

    const MetaRow = (props: { label: string; value: ReactNode }) => (
      <LabeledRow label={props.label} value={props.value} labelCols={2} dense muted />
    );

    addNode(
      <SectionBox
        title="// publications"
        centerTitle
        bodyClassName="p-3 space-y-4 text-xs sm:text-sm"
      >
        {publications.map((pub, index) => {
          const isLast = index === publications.length - 1;
          return (
            <div
              key={`${pub.title}-${index}`}
              className={`pb-4 ${isLast ? '' : 'border-b border-terminal-green/20'}`}
            >
              <div className="mb-3">
                <div className="bg-terminal-green/5 p-2 rounded mb-2">
                  <span className="text-terminal-bright-green font-semibold">{pub.title}</span>
                </div>
                <div className="ml-2 space-y-1">
                  <MetaRow label="Authors" value={pub.authors?.join(', ')} />
                  <MetaRow label="Journal" value={pub.journal} />
                  <MetaRow label="Date" value={pub.date} />
                  {pub.doi && (
                    <MetaRow
                      label="DOI"
                      value={
                        <ExtLink href={`https://doi.org/${pub.doi}`}>
                          https://doi.org/{pub.doi}
                        </ExtLink>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <ExploreMore
          items={[
            { cmd: 'experience', suffix: 'to see my professional background' },
            { cmd: 'projects', suffix: 'to view practical applications' },
            { cmd: 'contact', suffix: 'to discuss research collaboration' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

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
    portfolioData.cv.sections?.education?.forEach(edu => {
      timelineEvents.push({
        date: parseDate(edu.start_date),
        dateStr: edu.start_date,
        type: 'education',
        title: `${edu.degree} in ${edu.area}`,
        subtitle: edu.institution,
        endDate: edu.end_date ? parseDate(edu.end_date) : undefined,
        endDateStr: edu.end_date,
        description: edu.location || "",
        status: edu.end_date ? 'completed' : 'ongoing'
      });
    });

    // Add experience events
    portfolioData.cv.sections?.experience?.forEach(exp => {
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
      ?.slice(0, 3) // Take only top 3 projects
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
    if (portfolioData.cv.sections?.publication) {
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

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'education': return 'text-terminal-bright-green';
        case 'experience': return 'text-tui-accent-dim';
        case 'project': return 'text-terminal-green';
        case 'publication': return 'text-terminal-white';
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

    const stats = [
      { value: portfolioData.cv.sections?.experience?.length ?? 0, label: 'Positions' },
      { value: portfolioData.cv.sections?.education?.length ?? 0, label: 'Degrees' },
      {
        value:
          (portfolioData.cv.sections?.professional_projects?.length ?? 0) +
          (portfolioData.cv.sections?.personal_projects?.length ?? 0),
        label: 'Projects',
      },
      { value: portfolioData.cv.sections?.publication?.length ?? 0, label: 'Publications' },
    ];

    addNode(
      <Block title="// timeline" wide>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-tui-accent-dim/50" />

          <div className="space-y-5">
            {timelineEvents.map((event, index) => {
              const isOngoing = event.status === 'ongoing';
              const duration = event.endDateStr
                ? `${formatDateForDisplay(event.dateStr)} — ${isOngoing ? uiText.labels.present : formatDateForDisplay(event.endDateStr)}`
                : formatDateForDisplay(event.dateStr);
              return (
                <div key={index} className="relative flex items-start space-x-4 group">
                  <div className="relative z-10 pt-[5px]">
                    {/* Small diamond marker — avoids the "checkbox" read
                        of the previous outlined square. */}
                    <div
                      aria-hidden="true"
                      className={`w-2 h-2 rotate-45 bg-terminal-bright-green ${isOngoing ? 'animate-pulse shadow-[0_0_8px_rgba(var(--glow-color-rgb),0.7)]' : 'opacity-80'}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pb-2">
                    <div className="border-l-2 border-tui-accent-dim/40 pl-3 group-hover:border-terminal-bright-green transition-colors duration-150">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1 text-xs font-mono">
                        <span className={`${getTypeColor(event.type)} tracking-wide`}>
                          {getTypeLabel(event.type).toLowerCase()}
                        </span>
                        {isOngoing && (
                          <span className="text-terminal-bright-green animate-pulse">
                            · current
                          </span>
                        )}
                        <span className="text-tui-muted sm:ml-auto tabular-nums">
                          {duration}
                        </span>
                      </div>

                      <div className="mb-1">
                        <h3 className="text-terminal-bright-green text-sm">
                          {event.title}
                        </h3>
                        {event.subtitle && (
                          <p className="text-tui-accent-dim text-xs">{event.subtitle}</p>
                        )}
                        {event.description && (
                          <p className="text-white/70 text-xs">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-tui-accent-dim/30 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="border-l-2 border-tui-accent-dim/40 pl-2">
                  <div className="text-terminal-bright-green text-lg tabular-nums">{s.value}</div>
                  <div className="text-tui-muted text-xs uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Block>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showSearch = useCallback((args: string[]) => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const searchTerm = args.join(' ').toLowerCase();
    if (!searchTerm) {
      addNode(
        <Block title="// search">
          <div>
            <div className="text-tui-accent-dim text-xs mb-2">// usage</div>
            <div className="ml-1">
              <div className="text-white border-l-2 border-tui-accent-dim/40 pl-3 py-1">
                <span className="text-terminal-bright-green">search</span>{' '}
                <span className="text-tui-accent-dim">[term]</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-tui-accent-dim text-xs mb-2">// examples</div>
            <div className="ml-1 space-y-0.5">
              {['python', 'react', 'machine learning'].map((ex) => (
                <div key={ex} className="text-white/80 border-l-2 border-tui-accent-dim/40 pl-3 py-0.5 text-xs">
                  <span className="text-terminal-bright-green">search</span> {ex}
                </div>
              ))}
            </div>
          </div>
        </Block>,
        'w-full',
      );
      return;
    }

    type MatchRow = { label: string; text: string };
    type ResultGroup = { category: string; title: string; rows: MatchRow[] };

    const matches = (s: string | undefined) =>
      !!s && s.toLowerCase().includes(searchTerm);

    const { cv } = portfolioData;
    const results: ResultGroup[] = [];

    cv.sections?.intro?.forEach((intro, i) => {
      if (matches(intro)) {
        results.push({
          category: 'About',
          title: `Introduction ${i + 1}`,
          rows: [{ label: '', text: intro }],
        });
      }
    });

    cv.sections?.technologies?.forEach((tech) => {
      const rows: MatchRow[] = [];
      if (matches(tech.label)) rows.push({ label: 'Technology', text: tech.label });
      if (matches(tech.details)) rows.push({ label: 'Details', text: tech.details });
      if (rows.length) results.push({ category: 'Skills', title: tech.label, rows });
    });

    cv.sections?.experience?.forEach((exp) => {
      const rows: MatchRow[] = [];
      if (matches(exp.company)) rows.push({ label: 'Company', text: exp.company });
      if (matches(exp.position)) rows.push({ label: 'Position', text: exp.position });
      if (matches(exp.location)) rows.push({ label: 'Location', text: exp.location! });
      exp.highlights.forEach((h, i) => {
        if (matches(h)) rows.push({ label: `Highlight ${i + 1}`, text: h });
      });
      if (rows.length) {
        results.push({
          category: 'Experience',
          title: `${exp.position} at ${exp.company}`,
          rows,
        });
      }
    });

    cv.sections?.education?.forEach((edu) => {
      const rows: MatchRow[] = [];
      if (matches(edu.institution)) rows.push({ label: 'Institution', text: edu.institution });
      if (matches(edu.degree)) rows.push({ label: 'Degree', text: edu.degree });
      if (matches(edu.area)) rows.push({ label: 'Major', text: edu.area });
      if (matches(edu.location)) rows.push({ label: 'Location', text: edu.location ?? '' });
      edu.highlights?.forEach((h, i) => {
        if (matches(h)) rows.push({ label: `Highlight ${i + 1}`, text: h });
      });
      if (rows.length) {
        results.push({
          category: 'Education',
          title: `${edu.degree} in ${edu.area} from ${edu.institution}`,
          rows,
        });
      }
    });

    (['professional_projects', 'personal_projects'] as const).forEach((key) => {
      const cat = key === 'professional_projects' ? 'Professional Projects' : 'Personal Projects';
      cv.sections?.[key]?.forEach((proj) => {
        const rows: MatchRow[] = [];
        if (matches(proj.name)) rows.push({ label: 'Project', text: proj.name });
        proj.highlights.forEach((h, i) => {
          if (matches(h)) rows.push({ label: `Detail ${i + 1}`, text: h });
        });
        if (rows.length) results.push({ category: cat, title: proj.name, rows });
      });
    });

    const highlight = (text: string) => {
      // Split on the term (capture group so matches stay as array elements).
      // Use a case-insensitive equality check rather than regex.test(), which
      // with the /g flag carries `lastIndex` state and mis-classifies
      // subsequent parts.
      const safe = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const splitRegex = new RegExp(`(${safe})`, 'gi');
      const parts = text.split(splitRegex);
      const lowerTerm = searchTerm.toLowerCase();
      return parts.map((part, i) =>
        part.toLowerCase() === lowerTerm ? (
          <mark
            key={i}
            className="bg-terminal-yellow text-terminal-black font-bold rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      );
    };

    addNode(
      <SectionBox title="// search results">
        <div className="bg-terminal-green/5 p-2 rounded flex flex-wrap gap-x-3 gap-y-1">
          <span>
            <span className="text-terminal-yellow font-semibold">Search term:</span>
            <span className="text-white"> "{searchTerm}"</span>
          </span>
          <span className="text-terminal-green/60">•</span>
          <span className="text-terminal-bright-green font-semibold">
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
        </div>
        {results.length === 0 ? (
          <div className="border border-terminal-yellow/30 rounded p-3 text-center">
            <div className="text-terminal-yellow font-semibold mb-2">No results found</div>
            <div className="text-white opacity-80 text-xs">
              Try searching for technologies, company names, or project keywords
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, i) => (
              <div key={i} className="border border-terminal-green/20 rounded p-3">
                <div className="mb-2">
                  <span className="text-terminal-bright-green font-semibold text-xs">
                    [{result.category.toUpperCase()}]
                  </span>
                  <span className="text-terminal-yellow font-semibold ml-2">{result.title}</span>
                </div>
                <div className="text-white text-xs opacity-80 bg-terminal-green/5 p-2 rounded leading-relaxed">
                  {result.rows.map((row, j) => (
                    <div key={j}>
                      {row.label && <>{row.label}: </>}
                      {highlight(row.text)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <ExploreMore
          items={[
            { cmd: 'skills', suffix: 'to see all technologies' },
            { cmd: 'experience', suffix: 'to view work history' },
            { cmd: 'projects', suffix: 'to explore all projects' },
            { cmd: 'help', suffix: 'for all available commands' },
          ]}
        />
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showTheme = useCallback((args: string[]) => {
    // Accept either the key ("matrix") or the full name ("matrix green"),
    // case-insensitive, so users don't have to memorise the short keys.
    const theme = args.join(' ').trim().toLowerCase();

    if (!theme) {
      addNode(
        <SectionBox title="// themes" bodyClassName="p-3 space-y-1 text-xs sm:text-sm">
          {colorThemes.map((t) => {
            const [r, g, b] = t.accentRgb;
            return (
              <div key={t.key}>
                <span
                  style={{ color: `rgb(${r}, ${g}, ${b})` }}
                  className="font-semibold inline-block w-[10ch]"
                >
                  {t.key}
                </span>
                {' - '}
                {t.name}
              </div>
            );
          })}
          <div>
            <span className="text-terminal-yellow font-semibold inline-block w-[10ch]">reset</span>
            {' - Reset to default theme'}
          </div>
          <UsageHint usage="theme [name]" />
        </SectionBox>,
      );
      return;
    }

    if (theme === 'reset') {
      storage.remove(storageConfig.keys.theme);
      localStorage.removeItem('gui-color-theme');
      applyColorTheme(colorThemes[0]);
      addLine('// theme → reset', 'text-tui-accent-dim');
      return;
    }

    // Match by key OR full name (e.g. "matrix" or "matrix green"),
    // case-insensitive. Fall back to a tolerant contains-match so
    // "phosphor" alone still finds "Phosphor Cyan".
    const matchedTheme =
      colorThemes.find((t) => t.key.toLowerCase() === theme || t.name.toLowerCase() === theme) ??
      colorThemes.find((t) => t.name.toLowerCase().includes(theme));

    if (matchedTheme && themes[matchedTheme.key]) {
      const selectedTheme = themes[matchedTheme.key];
      applyColorTheme(matchedTheme);
      addLine(`// theme → ${selectedTheme.name.toLowerCase()}`, 'text-terminal-bright-green');
    } else {
      addLine(
        'theme not found. run `theme` to list available.',
        'text-tui-error',
      );
    }
  }, [addLine, addNode]);

  const showContact = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }
    const { cv } = portfolioData;

    const Row = (props: { label: string; value: ReactNode }) => (
      <LabeledRow label={props.label} value={props.value} />
    );

    addNode(
      <SectionBox
        title="// contact"
        centerTitle
        bodyClassName="p-3 space-y-3 text-xs sm:text-sm"
      >
        <div>
          <div className="text-tui-accent-dim text-xs mb-2">// personal</div>
          <div className="space-y-1 ml-1">
            <Row label="Name" value={cv.name} />
            <Row label="Location" value={cv.location} />
            <Row label="Email" value={cv.email} />
            <Row
              label="Phone"
              value={
                cv.phone ? (
                  <ExtLink href={cv.phone}>{cv.phone.replace(/[^\d+]/g, '')}</ExtLink>
                ) : (
                  ''
                )
              }
            />
          </div>
        </div>
        <div>
          <div className="text-tui-accent-dim text-xs mb-2">// social</div>
          <div className="space-y-1 ml-1">
            {cv.social_networks?.map((social) => {
              const url = getSocialNetworkUrl(social.network, social.username);
              return (
                <Row
                  key={social.network}
                  label={social.network}
                  value={<ExtLink href={url}>{social.username}</ExtLink>}
                />
              );
            })}
          </div>
        </div>
        <div className="border-t border-tui-accent-dim/30 pt-3">
          <div className="text-white/80 leading-relaxed text-xs mb-3 border-l-2 border-tui-accent-dim/50 pl-3">
            open to collaborations, new work, or a slow coffee chat.
          </div>
          <ExploreMore
            items={[
              { cmd: 'about', suffix: 'to learn more about me' },
              { cmd: 'projects', suffix: 'to see my work' },
              { cmd: 'experience', suffix: 'for my professional background' },
            ]}
          />
        </div>
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showWhoAmI = useCallback(() => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }
    const role = portfolioData.cv.sections?.experience?.[0]?.position || uiText.labels.professional;
    const firstCompany = portfolioData.cv.sections?.experience?.[0]?.company;
    const Row = ({ label, value }: { label: string; value: string | undefined }) => (
      <CompactRow label={label} value={value ?? '—'} labelWidth="w-24" />
    );
    // Rough uptime: time since the page loaded (session duration).
    const uptimeSec = Math.floor(performance.now() / 1000);
    const uptimeStr =
      uptimeSec < 60
        ? `${uptimeSec}s`
        : uptimeSec < 3600
          ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`
          : `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;
    addNode(
      <Block title="// whoami">
        <div className="space-y-1 font-mono">
          <Row label="user" value={portfolioData.cv.name?.toLowerCase().replace(/\s+/g, '')} />
          <Row label="display" value={portfolioData.cv.name} />
          <Row label="role" value={role} />
          {firstCompany && <Row label="company" value={firstCompany} />}
          <Row label="location" value={portfolioData.cv.location} />
          <Row label="shell" value="nagoya · portfolio tui v2.0" />
          <Row label="uptime" value={uptimeStr} />
        </div>
      </Block>,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showCat = useCallback((args: string[]) => {
    const filename = args[0];
    if (!filename) {
      addNode(
        <Block title="// cat">
          <div className="text-tui-accent-dim text-xs mb-1">// usage</div>
          <div className="text-white text-xs border-l-2 border-tui-accent-dim/40 pl-3 mb-2">
            cat <span className="text-tui-accent-dim">[filename]</span>
          </div>
          <div className="text-tui-accent-dim text-xs mb-1">// available</div>
          <div className="text-white text-xs border-l-2 border-tui-accent-dim/40 pl-3">
            resume.txt
          </div>
        </Block>,
        'w-full',
      );
      return;
    }

    if (filename !== 'resume.txt') {
      // Unix-literal — no bespoke red box. Matches the terse tone of
      // every other shell error ("bash: foo: command not found").
      addLine(`cat: ${filename}: no such file or directory`, 'text-tui-error');
      return;
    }

    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const { cv } = portfolioData;

    const Bullet = ({ md }: { md: string }) => (
      <div className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3 flex gap-2">
        <span className="text-tui-accent-dim shrink-0">·</span>
        <div className="flex-1">
          <MarkdownBlock source={md} inline />
        </div>
      </div>
    );

    const items: CollapsibleItemData[] = [];

    if (cv.sections?.intro?.length) {
      items.push({
        id: 'about',
        header: <span className="text-tui-accent-dim font-semibold">about</span>,
        content: (
          <div className="space-y-2">
            {cv.sections.intro.map((line, i) => (
              <div
                key={i}
                className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3"
              >
                <MarkdownBlock source={line} inline />
              </div>
            ))}
          </div>
        ),
      });
    }

    if (cv.sections?.technologies?.length) {
      items.push({
        id: 'technologies',
        header: <span className="text-tui-accent-dim font-semibold">technologies</span>,
        content: (
          <div className="space-y-1">
            {cv.sections.technologies.map((tech, i) => (
              <div
                key={i}
                className="text-xs leading-relaxed border-l-2 border-tui-accent-dim/40 pl-3"
              >
                <span className="text-terminal-bright-green">{tech.label}</span>
                <span className="text-white/80"> — </span>
                <span className="text-white/90">
                  <MarkdownBlock source={tech.details} inline />
                </span>
              </div>
            ))}
          </div>
        ),
      });
    }

    if (cv.sections?.experience?.length) {
      items.push({
        id: 'experience',
        header: <span className="text-terminal-yellow font-semibold">Experience</span>,
        content: (
          <div className="space-y-3">
            {cv.sections.experience.map((exp, i) => {
              const endDate = exp.end_date || uiText.labels.present;
              return (
                <div key={i} className="bg-terminal-green/5 p-3 rounded">
                  <div className="mb-2">
                    <span className="text-terminal-yellow font-semibold">{exp.position}</span>
                    <span className="text-white"> @ </span>
                    <span className="text-terminal-green font-bold">{exp.company}</span>
                  </div>
                  <div className="text-terminal-green mb-2">
                    {exp.location} | {exp.start_date} - {endDate}
                  </div>
                  {exp.highlights?.length > 0 && (
                    <div className="space-y-1">
                      {exp.highlights.map((h, j) => (
                        <Bullet key={j} md={h} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ),
      });
    }

    if (cv.sections?.education?.length) {
      items.push({
        id: 'education',
        header: <span className="text-terminal-yellow font-semibold">Education</span>,
        content: (
          <div className="space-y-3">
            {cv.sections.education.map((edu, i) => (
              <div key={i} className="bg-terminal-green/5 p-3 rounded">
                <div className="text-terminal-yellow font-semibold">
                  {edu.degree} in {edu.area} from {edu.institution}
                </div>
                <div className="text-terminal-green">{edu.location || ''}</div>
                <div className="text-terminal-green">
                  {edu.start_date} - {edu.end_date || 'Present'}
                </div>
                {(edu.highlights?.length ?? 0) > 0 && (
                  <div className="space-y-1 mt-2">
                    {edu.highlights?.map((h, j) => (
                      <Bullet key={j} md={h} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }

    const projectSections: Array<['professional_projects' | 'personal_projects', string, string]> = [
      ['professional_projects', 'professional', 'Professional Projects'],
      ['personal_projects', 'personal', 'Personal Projects'],
    ];
    projectSections.forEach(([key, id, label]) => {
      const projects = cv.sections?.[key];
      if (!projects?.length) return;
      items.push({
        id,
        header: <span className="text-terminal-yellow font-semibold">{label}</span>,
        content: (
          <div className="space-y-3">
            {projects.map((project, i) => (
              <div key={i} className="bg-terminal-green/5 p-3 rounded">
                <div className="mb-2">
                  <span className="text-terminal-yellow font-semibold">{project.name}</span>
                  <span className="text-terminal-green ml-2">({project.date})</span>
                </div>
                {project.highlights?.length > 0 && (
                  <div className="space-y-1">
                    {project.highlights.map((h, j) => (
                      <Bullet key={j} md={h} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    });

    if ((cv.sections?.publication?.length ?? 0) > 0) {
      items.push({
        id: 'publications',
        header: <span className="text-terminal-yellow font-semibold">Publications</span>,
        content: (
          <div className="space-y-3">
            {cv.sections!.publication!.map((pub, i) => (
              <div key={i} className="bg-terminal-green/5 p-3 rounded">
                <div className="text-terminal-yellow font-semibold mb-1">{pub.title}</div>
                <div className="text-terminal-green">{pub.authors.join(', ')}</div>
                <div className="text-terminal-green">
                  {pub.journal} ({pub.date})
                </div>
                {pub.doi && <div className="text-terminal-green">DOI: {pub.doi}</div>}
              </div>
            ))}
          </div>
        ),
      });
    }

    const personalInfo = (
      <div className="border border-terminal-green/30 bg-terminal-green/5 p-3 rounded">
        <div className="text-terminal-yellow font-bold text-lg mb-1">{cv.name}</div>
        <div className="text-terminal-green">
          <span className="text-terminal-yellow">Location:</span>{' '}
          <span className="text-terminal-green">{cv.location}</span>
        </div>
        <div className="text-terminal-green">
          <span className="text-terminal-yellow">Email:</span>{' '}
          <span className="text-terminal-green">{cv.email}</span>
        </div>
        {cv.phone && (
          <div className="text-terminal-green">
            <span className="text-terminal-yellow">Phone:</span>{' '}
            <a
              href={`tel:${cv.phone.replace(/[^\d+]/g, '')}`}
              className="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer"
            >
              {cv.phone.replace(/[^\d+]/g, '')}
            </a>
          </div>
        )}
        {(cv.social_networks?.length ?? 0) > 0 && (
          <div className="text-terminal-green">
            {cv.social_networks?.map((social, i) => (
              <div key={i}>
                <span className="text-terminal-yellow">{social.network}:</span>{' '}
                <span className="text-terminal-green">
                  {getSocialNetworkUrl(social.network, social.username)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    addNode(
      <CollapsibleGroup
        title="RESUME.TXT"
        preamble={personalInfo}
        items={items}
        bodyClassName="p-3 space-y-2 text-xs sm:text-sm font-mono"
        footer={
          <div className="mt-2">
            <ExploreMore
              items={[
                { cmd: 'about', suffix: 'for a formatted introduction' },
                { cmd: 'experience', suffix: 'for detailed work history' },
                { cmd: 'projects', suffix: 'for interactive project showcase' },
                { cmd: 'skills', suffix: 'for technology breakdown' },
              ]}
            />
          </div>
        }
      />,
      'w-full',
    );
  }, [addLine, addNode, portfolioData]);

  const showNeofetchFallback = useCallback(() => {
    if (!portfolioData) {
      return;
    }

    const { name, email, phone, location, website, sections } = portfolioData.cv;

    const width = 60;
    const border = '─'.repeat(width);
    const nameLine = name.toUpperCase();
    const nameSpacing = ' '.repeat(Math.max(0, Math.floor((width - nameLine.length) / 2)));
    const nameTrailing = ' '.repeat(Math.max(0, width - nameLine.length - nameSpacing.length));

    const infoRows: Array<[string, string]> = [];
    if (email) infoRows.push(['Email', email]);
    if (phone) infoRows.push(['Phone', phone]);
    if (location) infoRows.push(['Location', location]);
    if (website) infoRows.push(['Website', website]);

    // Skills row sits inside a 60-char ASCII border — truncate with an
    // ellipsis if the CV's top-5 labels would overflow.
    const rawSkills = sections?.technologies?.length
      ? sections.technologies.slice(0, 5).map((tech) => tech.label).join(', ')
      : null;
    const skillsBudget = width - 'Skills: '.length - 2; // account for "│ " prefix + " │" suffix
    const topSkills = rawSkills
      ? rawSkills.length > skillsBudget
        ? rawSkills.slice(0, Math.max(0, skillsBudget - 1)).trimEnd() + '…'
        : rawSkills
      : null;

    const pad = (label: string, value: string) => {
      const line = `${label}: ${value}`;
      return ' '.repeat(Math.max(0, width - line.length));
    };

    addNode(
      <div className="font-mono whitespace-pre text-terminal-green text-xs sm:text-sm leading-tight">
        <div>{'\u00A0'}</div>
        <div>┌{border}┐</div>
        <div>
          │{nameSpacing}
          <span className="text-terminal-yellow font-bold">{nameLine}</span>
          {nameTrailing}│
        </div>
        <div>├{border}┤</div>
        {infoRows.map(([label, value]) => (
          <div key={label}>
            │ <span className="text-terminal-green">{label}:</span> {value}
            {pad(label, value)}│
          </div>
        ))}
        {topSkills && (
          <>
            <div>├{border}┤</div>
            <div>
              │ <span className="text-terminal-green">Skills:</span> {topSkills}
              {pad('Skills', topSkills)}│
            </div>
          </>
        )}
        <div>└{border}┘</div>
        <div>{'\u00A0'}</div>
        <div className="text-tui-muted">
          tip: create a custom banner by adding client/public/data/neofetch.txt
        </div>
        <div>{'\u00A0'}</div>
      </div>,
    );
  }, [addNode, portfolioData]);

  const showNeofetch = useCallback(async () => {
    if (!portfolioData) {
      addLine(uiText.messages.error.portfolioNotLoaded, 'text-terminal-red');
      return;
    }

    const isMobile = window.innerWidth < apiConfig.responsive.neofetchMobileBreakpoint;

    try {
      const filePath = isMobile ? apiConfig.endpoints.neofetchSmall : apiConfig.endpoints.neofetch;
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status}`);
      }
      const neofetchContent = await response.text();

      // The stock neofetch files are authored with U+2007 (FIGURE SPACE) as
      // the column separator. Heavy box-drawing chars like U+2501 don't
      // render at the same width as figure space in most monospace fonts,
      // which jags the right edges of the ASCII boxes. Normalise any
      // Unicode space variant to a regular space inside the <pre>.
      const normalised = neofetchContent.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

      addNode(
        <pre className="font-mono text-terminal-green whitespace-pre text-xs sm:text-sm leading-tight overflow-x-auto">
          {normalised}
        </pre>,
      );
    } catch (error) {
      console.error('Error loading neofetch content:', error);
      showNeofetchFallback();
    }
  }, [addLine, addNode, portfolioData, showNeofetchFallback]);

  const listCommands = useCallback(() => {
    const commands = getAllCommandNames();
    addNode(
      <Block title="// ls">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-0.5 text-xs sm:text-sm font-mono">
          {commands.map((cmd) => (
            <CmdLink key={cmd} cmd={cmd} className="text-terminal-green font-normal">
              {cmd}
            </CmdLink>
          ))}
        </div>
        <div className="pt-2 mt-2 border-t border-tui-accent-dim/30 text-xs text-tui-muted">
          {commands.length} commands · try <CmdLink cmd="help" className="text-tui-accent-dim">help</CmdLink> for descriptions
        </div>
      </Block>,
      'w-full',
    );
  }, [addNode, getAllCommandNames]);

  const showHistory = useCallback((args: string[]) => {
    if (args[0] === 'clear') {
      setCommandHistory([]);
      setHistoryIndex(-1);
      storage.remove(storageConfig.keys.commandHistory);
      addLine('Command history cleared.', 'text-terminal-yellow');
      return;
    }

    if (commandHistory.length === 0) {
      addNode(
        <SectionBox title="// history">
          <div className="text-terminal-yellow">No commands in history yet.</div>
          <div className="text-white/70 text-xs">
            Commands you run are saved to local storage; they'll show up here.
          </div>
        </SectionBox>,
        'w-full',
      );
      return;
    }

    // Oldest-first for a natural "scrollback" read order. commandHistory is
    // stored newest-first, so reverse a shallow copy.
    const ordered = [...commandHistory].reverse();
    const width = String(ordered.length).length;

    addNode(
      <SectionBox
        title="// history"
        centerTitle
        bodyClassName="p-3 space-y-0.5 text-xs sm:text-sm font-mono"
      >
        {ordered.map((cmd, i) => (
          <div key={i} className="flex gap-3 hover:bg-terminal-green/5 rounded px-1">
            <span
              className="text-terminal-green/60 tabular-nums text-right"
              style={{ minWidth: `${width}ch` }}
            >
              {i + 1}
            </span>
            <CmdLink cmd={cmd} className="text-terminal-yellow">
              {cmd}
            </CmdLink>
          </div>
        ))}
        <div className="border-t border-terminal-green/30 pt-2 mt-2 text-xs text-white/70">
          {ordered.length} of {storageConfig.limits.maxHistoryItems} slots used ·{' '}
          Type{' '}
          <CmdLink cmd="history clear" className="text-terminal-yellow">
            history clear
          </CmdLink>{' '}
          to wipe local storage.
        </div>
      </SectionBox>,
      'w-full',
    );
  }, [addLine, addNode, commandHistory]);

  // ── Hidden-command handlers (phase 9 easter eggs) ──

  const QUOTES = [
    'the best way to predict the future is to implement it.',
    'simplicity is the soul of efficiency.',
    'a user interface is like a joke — if you have to explain it, it\'s not that good.',
    'programs must be written for people to read, and only incidentally for machines to execute.',
    'the computer was born to solve problems that did not exist before.',
    'first, solve the problem. then, write the code.',
    'debugging is twice as hard as writing the code in the first place.',
    'code is read far more often than it is written.',
    'make it work, make it right, make it fast.',
    'there are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.',
  ];

  const showQuote = useCallback(() => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    addNode(
      <Block title="// quote">
        <div className="border-l-2 border-tui-accent-dim/60 pl-3 italic text-white/90 leading-relaxed">
          {q}
        </div>
      </Block>,
      'w-full',
    );
  }, [addNode]);

  const showCoffee = useCallback(() => {
    // Hidden ASCII cup — emoji is ok here because it's a deliberate
    // easter egg moment, not decorative chrome.
    addNode(
      <Block title="// coffee">
        <pre className="text-terminal-bright-green text-xs leading-tight whitespace-pre font-mono">{`
      ( (
       ) )
    ........
    |      |]
    \\      /
     \`----'`}</pre>
        <div className="text-white/80 text-xs mt-2">
          ☕ thanks for visiting. caffeine sent telepathically.
        </div>
      </Block>,
      'w-full',
    );
  }, [addNode]);

  const showRmRf = useCallback(async () => {
    // Theatrical `rm -rf /` — hybrid of Permission-denied wall + rapid
    // fake deletions + recovery wink. Two acts:
    //
    //   Act 1 (D): Unix-faithful "Permission denied" wall. System looks
    //              resistant. User expects the joke to end here.
    //   Act 2 (A): transition shows privilege "escalation", then a
    //              cascade of fake deletions. Climax wipes the screen.
    //              Recovery line restores context with a dry joke.
    //
    // The whole theater takes ~3.2s — short enough that users watch it
    // rather than type through it.
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    // The default scroll-anchor pins the command at the top of the
    // viewport, which means the theater cascade flows off-screen. For
    // this show specifically, override by scrolling the pane to the
    // bottom after each beat.
    const stickBottom = () => {
      const pane = document.querySelector<HTMLElement>('[role="log"]');
      if (pane) pane.scrollTop = pane.scrollHeight;
    };
    const beat = (text: string, cls: string) => {
      addLine(text, cls);
      // Defer to the next paint so the scrollHeight includes the line.
      requestAnimationFrame(stickBottom);
    };

    // --- Act 1: permission denied --------------------------------------
    const protectedPaths = [
      '/boot/grub',
      '/etc/shadow',
      '/usr/bin',
      '/var/log/syslog',
      '/sys/kernel',
      '/dev/sda',
      '/root',
      '/home/subhayu',
    ];
    for (const p of protectedPaths) {
      beat(`rm: cannot remove '${p}': Permission denied`, 'text-tui-error');
      await delay(55);
    }
    await delay(350);

    // --- Transition: escalate ------------------------------------------
    beat('escalating privileges…', 'text-tui-warn');
    await delay(650);
    beat('[sudo] password for visitor: ········', 'text-tui-muted');
    await delay(250);
    beat(
      'authentication bypass: portfolio_mode=true',
      'text-terminal-bright-green',
    );
    await delay(450);

    // --- Act 2: rapid fake deletions -----------------------------------
    const condemned = [
      '/bin', '/etc', '/lib', '/lib64', '/opt', '/proc', '/root',
      '/sbin', '/sys', '/tmp', '/usr', '/var',
      '/home/subhayu/.ssh',
      '/home/subhayu/.bash_history',
      '/home/subhayu/portfolio',
      '/home/subhayu/portfolio/about',
      '/home/subhayu/portfolio/experience',
      '/home/subhayu/portfolio/projects',
      '/home/subhayu/portfolio/skills',
      '/home/subhayu',
      '/',
    ];
    for (const p of condemned) {
      beat(`removing ${p}`, 'text-tui-error');
      await delay(30);
    }
    await delay(250);
    beat('!!! filesystem vanished !!!', 'text-terminal-bright-green');
    await delay(800);

    // --- Recovery ------------------------------------------------------
    clearTerminal();
    addLine('// restored from backup (3.2s). nothing actually broke.', 'text-terminal-bright-green');
    addLine(
      "// turns out you can't delete a read-only portfolio. try `help`.",
      'text-tui-accent-dim',
    );
  }, [addLine, clearTerminal]);

  const showSudo = useCallback((args: string[]) => {
    const sub = args.join(' ').trim();
    if (!sub) {
      addLine('usage: sudo <command>', 'text-tui-muted');
      return;
    }
    if (/^rm\s+-r?f?\s*\/?/i.test(sub)) {
      // Route the classic meme through the actual `rm -rf /` theater —
      // `sudo rm -rf /` gets a brief wink before the show starts.
      addLine(
        'sudo: privilege escalation acknowledged. unleashing…',
        'text-tui-warn',
      );
      setTimeout(() => void showRmRf(), 250);
      return;
    }
    if (/shutdown|reboot|halt/i.test(sub)) {
      addLine('i would if i could.', 'text-tui-accent-dim');
      return;
    }
    addLine(
      `[sudo] password for visitor: ········`,
      'text-tui-muted',
    );
    addLine('sorry, no sudo for you.', 'text-tui-accent-dim');
  }, [addLine]);

  const showMatrix = useCallback(() => {
    if (onTriggerMatrix) {
      addLine('// matrix — rain summoned. any key dismisses.', 'text-terminal-bright-green');
      onTriggerMatrix();
    } else {
      addLine(
        'matrix screensaver: idle for 30s to see it.',
        'text-tui-accent-dim',
      );
    }
  }, [addLine, onTriggerMatrix]);

  const showStats = useCallback(async () => {
    // Fetch the live pypi-stats.json; same source as the GUI hero.
    let pypi: PyPIStatsData | null = null;
    try {
      pypi = await loadPyPIStats();
    } catch {
      pypi = null;
    }

    // Fall back to a synthesized demo series if the stats file is
    // missing (pre-deploy / template clones / first-run). The sparkline
    // command should always demo SOMETHING — a useful feature shouldn't
    // silently vanish when real data isn't around.
    const isDemo = !pypi || Object.keys(pypi.packages).length === 0;
    if (isDemo) {
      pypi = buildDemoPypi();
    }

    const packages = Object.values(pypi!.packages);
    // Sort by total downloads descending so the headline number leads.
    packages.sort((a, b) => b.total_all_time - a.total_all_time);

    const fetchedDate = pypi!.fetched_at
      ? new Date(pypi!.fetched_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    addNode(
      <Block title="// stats" wide>
        <div className="mb-3 flex items-baseline gap-3 text-xs sm:text-sm font-mono">
          <span className="text-tui-accent-dim">pypi</span>
          <span className="text-terminal-bright-green text-lg tabular-nums">
            {formatCompact(pypi!.total_downloads)}
          </span>
          <span className="text-tui-muted text-xs">total downloads</span>
          {isDemo && (
            <span className="text-tui-warn/80 text-[10px] uppercase tracking-wide">
              · demo data
            </span>
          )}
          {fetchedDate && (
            <span className="text-tui-muted/70 text-[10px] ml-auto">
              as of {fetchedDate}
            </span>
          )}
        </div>

        <div className="text-tui-accent-dim text-xs mb-2">// packages</div>
        <div className="space-y-1.5 font-mono text-xs">
          {packages.map((pkg) => {
            const weekly = pkg.weekly.map((w) => w.downloads);
            const last = weekly[weekly.length - 1] ?? pkg.last_week;
            return (
              <div
                key={pkg.name}
                className="grid grid-cols-12 items-baseline gap-2 border-l-2 border-tui-accent-dim/40 pl-3"
              >
                <span className="col-span-4 sm:col-span-3 text-terminal-bright-green truncate">
                  {pkg.name}
                </span>
                <span className="col-span-5 sm:col-span-6">
                  <BrailleSparkline data={weekly} width={28} />
                </span>
                <span className="col-span-3 sm:col-span-3 text-right text-tui-muted tabular-nums">
                  {formatCompact(last)}/wk
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-tui-accent-dim/30 text-xs text-tui-muted">
          sparklines show weekly downloads for the last{' '}
          {packages[0]?.weekly.length ?? 0} weeks. data refreshed daily.
        </div>
      </Block>,
      'w-full',
    );
  }, [addLine, addNode]);

  const showKonami = useCallback(() => {
    // Reuse the GUI's cycleTheme helper so the flash affects both views.
    const next = cycleTheme();
    addLine(`// theme → ${next.name.toLowerCase()}`, 'text-terminal-bright-green');
  }, [addLine]);

  const executeCommand = useCallback((command: string) => {
    if (!command.trim()) return;

    // Vim-style `:cmd args` aliases. Normalise `:q` → `gui`, `:wq` →
    // an easter-egg flourish, `:theme x` → `theme x`, etc. This runs
    // before the command echo so the scrollback shows the canonical
    // form the handler actually ran.
    let normalised = command.trim();
    if (normalised.startsWith(':')) {
      const raw = normalised.slice(1).trim().toLowerCase();
      if (raw === 'q' || raw === 'quit') {
        normalised = 'gui';
      } else if (raw === 'wq') {
        // Shell out to gui after the flourish — the echo line shows :wq,
        // then the gui command executes.
        addLine('nothing to save. you\'re a read-only visitor here.', 'text-tui-accent-dim');
        normalised = 'gui';
      } else if (raw === 'help' || raw === 'h') {
        normalised = 'help';
      } else if (raw === 'clear' || raw === 'cls') {
        normalised = 'clear';
      } else if (raw.startsWith('theme')) {
        normalised = raw;
      } else if (raw === 'palette' || raw === 'k') {
        // `:palette` / `:k` would open the command palette — handled at
        // the Terminal level via Ctrl+K. Print a nudge here.
        addLine('press ⌃K to open the command palette.', 'text-tui-muted');
        return;
      } else {
        // Unknown colon shortcut — fall through to treat as regular cmd.
        normalised = raw;
      }
    }
    const effectiveCommand = normalised;

    // Derive user slug from cv.name so the echoed line matches the
    // live prompt. Falls back to 'guest' if data isn't loaded yet.
    const user = derivePromptUser(portfolioData?.cv.name);
    addLine(`${user}@portfolio ${currentDir} $ ${command}`, 'text-terminal-green font-semibold', true);
    setCommandHistory(prev => {
      // Collapse duplicates at the top so spamming the same command doesn't
      // fill history. Cap at `maxHistoryItems` from storage config.
      const deduped = prev[0] === command ? prev : [command, ...prev];
      return deduped.slice(0, storageConfig.limits.maxHistoryItems);
    });
    setHistoryIndex(-1);

    // `args` + `cmd` are parsed from the :-normalised string — that's
    // what handlers actually see and route on.
    const args = effectiveCommand.trim().split(' ');
    const cmd = args[0].toLowerCase();

    // Check if command is available (exists in registry and passes availability check)
    const availableCommandNames = getAllCommandNames();
    if (!availableCommandNames.includes(cmd)) {
      // Check if command exists in registry but is unavailable due to missing data
      const commandInRegistry = COMMAND_REGISTRY.find(c =>
        c.name === cmd || c.aliases?.includes(cmd)
      );

      if (commandInRegistry && commandInRegistry.isAvailable && !commandInRegistry.isAvailable(portfolioData)) {
        addLine(`command '${cmd}' is not available (no data found)`, 'text-tui-accent-dim');
        setLastExitCode(1);
        return;
      }

      // Command doesn't exist at all
      addLine(formatMessage(uiText.messages.error.commandNotFound, { cmd }), 'text-tui-error');
      setLastExitCode(127);
      return;
    }

    // Navigation commands move the prompt dir; utility commands don't.
    if (DESTINATION_COMMANDS.has(cmd)) {
      // Normalise aliases to their canonical dir (clone/fork → replicate).
      const canonical = cmd === 'clone' || cmd === 'fork' ? 'replicate' : cmd;
      setCurrentDir(`~/${canonical}`);
    } else if (cmd === 'welcome') {
      setCurrentDir('~');
    } else if (cmd === 'cat' && args[1] === 'resume.txt') {
      setCurrentDir('~/docs');
    }
    // Success by default; specific commands override below if they fail.
    setLastExitCode(0);

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
        // Mirror Unix: strip leading `~` and render as an absolute path.
        addLine(`/home/${user}/portfolio${currentDir.replace(/^~/, '')}`, 'text-white');
        break;
      case 'cat':
        showCat(args.slice(1));
        break;
      case 'neofetch':
        showNeofetch();
        break;
      case 'gui':
        if (onSwitchToGUI) {
          addLine('switching to gui…', 'text-tui-accent-dim');
          // One paint to flush the banner, then hand off — no arbitrary delay.
          requestAnimationFrame(() => onSwitchToGUI());
        } else {
          addLine('GUI view is not available.', 'text-terminal-red');
        }
        break;
      case 'replicate':
      case 'clone':
      case 'fork':
        showReplicate();
        break;
      case 'clear':
        clearTerminal();
        break;
      case 'history':
        showHistory(args.slice(1));
        break;
      case 'quote':
        showQuote();
        break;
      case 'coffee':
        showCoffee();
        break;
      case 'sudo':
        showSudo(args.slice(1));
        break;
      case 'matrix':
        showMatrix();
        break;
      case 'konami':
        showKonami();
        break;
      case 'rm': {
        // The infamous command. Unix-faithful for anything that
        // isn't `-rf /`; full theater for the classic.
        const tail = args.slice(1).join(' ').trim();
        if (/^-r?f?r?\s*\/?(\*|\/)?$/i.test(tail) || tail === '-rf /' || tail === '-rf /*' || tail === '-fr /') {
          void showRmRf();
        } else if (!tail) {
          addLine('rm: missing operand', 'text-tui-error');
          addLine("try 'rm --help' for more information.", 'text-tui-muted');
          setLastExitCode(1);
        } else {
          addLine(`rm: cannot remove '${tail}': Permission denied`, 'text-tui-error');
          setLastExitCode(1);
        }
        break;
      }
      case 'stats':
        showStats();
        break;
      case 'open':
      case 'o':
      case 'g': {
        const n = parseInt(args[1] ?? '', 10);
        if (Number.isNaN(n)) {
          addLine('usage: o <N>  — open link number N in view', 'text-tui-muted');
          setLastExitCode(1);
          break;
        }
        const link = linkRegistry.resolve(n);
        if (link) {
          window.open(link.href, '_blank', 'noopener,noreferrer');
          addLine(`→ opening ${link.label}`, 'text-tui-accent-dim');
        } else {
          addLine(`no link #${n} in view`, 'text-tui-error');
          setLastExitCode(1);
        }
        break;
      }
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
        addLine(formatMessage(uiText.messages.error.commandNotFound, { cmd }), 'text-tui-error');
        addNode(
          <span className="text-tui-accent-dim text-xs">
            type <CmdLink cmd="help">help</CmdLink>{' '}
            or click a command to get started.
          </span>,
        );
        setLastExitCode(127);
    }
  }, [addLine, addNode, showHelp, openResumePdf, showWelcomeMessage, showAbout, showSkills, showExperience, showEducation, showProjects, showPersonalProjects, showContact, showPublications, showTimeline, showSearch, showTheme, showWhoAmI, listCommands, showCat, showNeofetch, showReplicate, showHistory, clearTerminal, showGenericSection, showQuote, showCoffee, showSudo, showMatrix, showKonami, showStats, showRmRf, linkRegistry, portfolioData, onSwitchToGUI, currentDir]);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return currentInput;

    // `commandHistory` is newest-first ([newest, …, oldest]).
    // `historyIndex = -1` means "not currently browsing"; Up advances to 0
    // (newest), Up again goes to 1 (next-newest), capped at oldest.
    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    } else {
      newIndex = Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);
    return newIndex === -1 ? '' : commandHistory[newIndex];
  }, [commandHistory, historyIndex, currentInput]);

  const getCommandSuggestions = useCallback((input: string) => {
    if (!input.trim()) return [];
    const commands = getAllCommandNames();
    // Source theme subcommands from the palette itself so new themes show
    // up automatically. `reset` is kept as an explicit sentinel.
    const themeSubCommands = [...colorThemes.map((t) => t.key), 'reset'];
    const subCommands = ['cat resume.txt', ...themeSubCommands.map((color) => `theme ${color}`)];
    const lower = input.toLowerCase();
    let matched = commands.filter((cmd) => cmd.startsWith(lower));
    if (matched.length === 0) {
      matched = subCommands.filter((cmd) => cmd.startsWith(lower));
    }
    return matched;
  }, [getAllCommandNames]);

  const getAllCommands = useCallback(() => {
    return getAllCommandNames();
  }, [getAllCommandNames]);

  // Username slug for prompt display — derived from cv.name once loaded.
  const promptUser = derivePromptUser(portfolioData?.cv.name);

  return {
    lines,
    executeCommand,
    navigateHistory,
    // `true` while the user is browsing history via arrow keys. Terminal.tsx
    // uses this to suppress the autocomplete dropdown — otherwise the first
    // Up fires history recall, autocomplete opens on the recalled text, and
    // subsequent Ups get intercepted by the autocomplete navigation.
    isBrowsingHistory: historyIndex !== -1,
    getCommandSuggestions,
    getAllCommands,
    isTyping,
    currentInput,
    setCurrentInput,
    clearTerminal,
    showWelcomeMessage,
    // Starship-style prompt context.
    currentDir,
    lastExitCode,
    promptUser,
    promptHost: terminalConfig.prompt.hostname,
    // Used by the status bar to render live counts.
    historyLength: commandHistory.length,
    // Exposed for the command palette (phase 6).
    getCommandMetadata: getAvailableCommands,
    recentCommands: commandHistory,
    // Link registry — consumed by NumberedLink + Terminal.tsx's
    // `o N` / `g N` keyboard resolver (phase 7).
    linkRegistry,
  };
}