import { useState, useCallback, useRef, useEffect } from 'react';
import { type PortfolioData } from '../../../shared/schema';
import { formatExperiencePeriod, getSocialNetworkUrl } from '../lib/portfolioData';

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
  return portfolioData.cv.social_networks.find(sn => sn.network.toLowerCase() === network.toLowerCase())?.username;
}

// Helper function to parse dates and create timeline events
const parseDate = (dateStr: string): Date => {
  // Handle various date formats: "2022-06", "Jun 2022", "2022", etc.
  const cleanDate = dateStr.replace(/[^\d-]/g, '').trim();
  if (cleanDate.includes('-')) {
    const [year, month] = cleanDate.split('-');
    return new Date(parseInt(year), month ? parseInt(month) - 1 : 0);
  }
  return new Date(parseInt(cleanDate), 0);
};

const formatDateForDisplay = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short' 
  });
};

function getProjectsHtml(projectData: { name: string; date: string; highlights: string[] }[], type: string): string {
  return `
    <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
      <div class="border-b border-terminal-green/30 px-3 py-1">
        <div class="flex items-center justify-between">
          <span class="text-terminal-bright-green text-sm font-bold">${type.toUpperCase()} PROJECTS</span>
          <button 
            onclick="toggleAllProjects('${type}')" 
            class="text-xs px-2 py-1 border border-terminal-green/50 rounded hover:bg-terminal-green/10 transition-colors text-terminal-yellow"
            id="expand-all-btn"
          >
            Expand All
          </button>
        </div>
      </div>
      <div class="p-3 space-y-2 text-xs sm:text-sm">
        ${projectData.map((project, index) => {
          const projectId = `${type}-project-${index}`;
          return `
            <div class="border border-terminal-green/20 rounded">
              <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('${projectId}')">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <span class="text-terminal-yellow font-semibold">${project.name}</span>
                    <span class="text-white opacity-60 text-xs ml-2">${project.date}</span>
                  </div>
                  <div class="text-terminal-bright-green ml-2">
                    <span id="${projectId}-icon">▶</span>
                  </div>
                </div>
              </div>
              <div id="${projectId}" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                <div class="space-y-1">
                  ${project.highlights.map(highlight => `
                    <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                      • ${highlight}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        <div class="border-t border-terminal-green/30 pt-3 mt-4">
          <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
          <div class="space-y-1 ml-2 text-xs">
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to see my professional background</div>
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> to see technologies I've mastered</div>
            <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=timeline">timeline</a></span> for a chronological career overview</div>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

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

  const addMultipleLines = useCallback((contents: string[], className?: string, delay = 100) => {
    contents.forEach((content, index) => {
      setTimeout(() => {
        addLine(content, className);
      }, index * delay);
    });
  }, [addLine]);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  const showHelp = useCallback(() => {
    // Create the help content as a single HTML string
    const helpBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">AVAILABLE COMMANDS</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">📋 INFORMATION</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=help">help</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show this help message</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=about">about</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display introduction and background</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=whoami">whoami</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show current user information</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=neofetch">neofetch</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display system information (portfolio stats)</span></div></div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">💼 PROFESSIONAL</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=skills">skills</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">List technical skills and technologies</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=experience">experience</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show work experience and roles</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=education">education</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display educational background</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=projects">projects</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show professional projects</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=personal">personal</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show personal projects and open source work</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=publications">publications</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show research publications and papers</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=timeline">timeline</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display career timeline and milestones</span></div></div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">📧 CONTACT</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=contact">contact</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display contact information and social links</span></div></div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">🔧 TOOLS</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=search">search</a></span><span class="text-white"> [term]</span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Search across all content</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=theme">theme</a></span><span class="text-white"> [name]</span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Change terminal color theme</span></div></div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">⌨️ TERMINAL</div>
            <div class="space-y-1 ml-2">
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=clear">clear</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Clear the terminal screen</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=ls">ls</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">List available commands</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=pwd">pwd</a></span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Show current directory</span></div></div>
              <div class="grid grid-cols-12 gap-4"><div class="col-span-3 bg-terminal-green/10"><span class="text-terminal-yellow font-semibold"><a href="?cmd=cat">cat</a></span><span class="text-white"> [file]</span></div><div class="col-span-9 bg-terminal-green/5"><span class="text-white">Display file contents (try: \`<a href="?cmd=cat%20resume.txt">cat resume.txt</a>\`)</span></div></div>
            </div>
          </div>
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
            Start with \`about\` to learn more about me, or try \`neofetch\` for a quick overview!
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire help box as a single line
    addLine(helpBox, 'w-full');
  }, [addLine]);

  const showAbout = useCallback(() => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
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
              ${portfolioData.cv.sections.intro.map(paragraph => 
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
                    <a href="${portfolioData.cv.website}" class="hover:text-terminal-bright-green">${portfolioData.cv.website.replace('https://', '').trim()}</a> (you are here)
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
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=contact">contact</a></span> for all my social links</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> to see my technical expertise</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to view my work history</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to explore my work</div>
            </div>
          </div>
        </div>
      </div>
    `.trim();
    
    // Add the entire about box as a single line
    addLine(aboutBox, 'w-full');
  }, [addLine, portfolioData]);

  const showSkills = useCallback(() => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
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
            ${portfolioData.cv.sections.technologies.map(tech => `
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
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to see these skills in action</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to see how I've applied them professionally</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=personal">personal</a></span> to explore my open source contributions</div>
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    // Create the experience content as a single HTML string, matching showSkills structure
    const experienceBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">PROFESSIONAL EXPERIENCE</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${portfolioData.cv.sections.experience.map((job, index) => {
            const period = formatExperiencePeriod(job.start_date, job.end_date);
            return `
              <div class="border-b border-terminal-green/20 pb-4 ${index === portfolioData.cv.sections.experience.length - 1 ? 'border-b-0 pb-0' : ''}">
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
                </div>
              </div>
            `;
          }).join('')}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to see specific work examples</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> to see technologies I've mastered</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=timeline">timeline</a></span> for a chronological career overview</div>
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    // Create the education content as a single HTML string, matching showExperience structure
    const educationBox = `
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">EDUCATION</span>
        </div>
        <div class="p-3 space-y-4 text-xs sm:text-sm">
          ${portfolioData.cv.sections.education.map((edu, index) => {
            const period = `${edu.start_date} - ${edu.end_date}`;
            return `
              <div class="border-b border-terminal-green/20 pb-4 ${index === portfolioData.cv.sections.education.length - 1 ? 'border-b-0 pb-0' : ''}">
                <div class="mb-3">
                  <div class="bg-terminal-green/5 p-2 rounded mb-2">
                    <span class="text-terminal-yellow font-semibold">${edu.degree} in ${edu.area}</span>
                    <span class="text-white"> from </span>
                    <span class="text-terminal-bright-green font-bold">${edu.institution}</span>
                  </div>
                  <div class="ml-2">
                    <span class="text-white opacity-80 text-xs">${edu.location} | ${period}</span>
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
              </div>
            `;
          }).join('')}
          <div class="border-t border-terminal-green/30 pt-3">
            <div class="text-terminal-yellow font-bold mb-2">💡 LEARN MORE</div>
            <div class="space-y-1 ml-2 text-xs">
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to see my professional background</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> to see technologies I've mastered</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to see specific work examples</div>
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    // Create the projects content as a single HTML string with collapsible functionality
    const projectsBox = getProjectsHtml(portfolioData.cv.sections.selected_projects, 'professional');
    
    // Add the entire projects box as a single line
    addLine(projectsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showPersonalProjects = useCallback(() => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    // Create the projects content as a single HTML string with collapsible functionality
    const projectsBox = getProjectsHtml(portfolioData.cv.sections.personal_projects, 'personal');
    
    // Add the entire projects box as a single line
    addLine(projectsBox, 'w-full');
  }, [addLine, portfolioData]);

  const showPublications = useCallback(() => {
    if (!portfolioData?.cv.sections.publication || portfolioData.cv.sections.publication.length === 0) {
      addLine('No publications found', 'text-terminal-red');
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
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to see my professional background</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to view practical applications</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=contact">contact</a></span> to discuss research collaboration</div>
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
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
    portfolioData.cv.sections.education.forEach(edu => {
      timelineEvents.push({
        date: parseDate(edu.start_date),
        dateStr: edu.start_date,
        type: 'education',
        title: `${edu.degree} in ${edu.area}`,
        subtitle: edu.institution,
        endDate: parseDate(edu.end_date),
        endDateStr: edu.end_date,
        description: edu.location,
        status: 'completed'
      });
    });

    // Add experience events
    portfolioData.cv.sections.experience.forEach(exp => {
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
    portfolioData.cv.sections.selected_projects
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
          subtitle: 'Professional Project',
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
                  `${formatDateForDisplay(event.dateStr)} - ${isOngoing ? 'Present' : formatDateForDisplay(event.endDateStr)}` :
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
                    case 'education': return 'EDUCATION';
                    case 'experience': return 'WORK';
                    case 'project': return 'PROJECT';
                    case 'publication': return 'RESEARCH';
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
                    ${portfolioData.cv.sections.experience.length}
                  </div>
                  <div class="text-white/70 text-xs">Positions</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-blue-400 font-bold text-lg">
                    ${portfolioData.cv.sections.education.length}
                  </div>
                  <div class="text-white/70 text-xs">Degrees</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-purple-400 font-bold text-lg">
                    ${portfolioData.cv.sections.selected_projects.length + portfolioData.cv.sections.personal_projects.length}
                  </div>
                  <div class="text-white/70 text-xs">Projects</div>
                </div>
                <div class="bg-terminal-green/5 rounded-lg p-3">
                  <div class="text-yellow-400 font-bold text-lg">
                    ${portfolioData.cv.sections.publication?.length || 0}
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
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
    cv.sections.intro.forEach((intro, i) => {
      if (intro.toLowerCase().includes(searchTerm)) {
        results.push({
          category: 'About',
          title: `Introduction ${i + 1}`,
          content: highlightMatch(intro, searchTerm)
        });
      }
    });

    // Search in technologies/skills
    cv.sections.technologies.forEach(tech => {
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
    cv.sections.experience.forEach(exp => {
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
    cv.sections.education.forEach(edu => {
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
      if (edu.location.toLowerCase().includes(searchTerm)) {
        matchedContent.push(`Location: ${highlightMatch(edu.location, searchTerm)}`);
      }
      
      // Check highlights for matches
      edu.highlights.forEach((highlight, index) => {
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
    cv.sections.selected_projects.forEach(proj => {
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
    cv.sections.personal_projects.forEach(proj => {
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
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> to see all technologies</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> to view work history</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to explore all projects</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=help">help</a></span> for all available commands</div>
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
      addLine('');
      addLine('<span class="text-terminal-yellow">Usage: theme [name]</span>');
      return;
    }

    const themes: Record<string, { primary: string; secondary: string; name: string }> = {
      matrix: { primary: '#00FF00', secondary: '#33FF33', name: 'Matrix Green' },
      blue: { primary: '#00BFFF', secondary: '#87CEEB', name: 'Cyberpunk Blue' },
      purple: { primary: '#9370DB', secondary: '#DDA0DD', name: 'Hacker Purple' },
      amber: { primary: '#FFA500', secondary: '#FFD700', name: 'Vintage Amber' },
      red: { primary: '#FF0000', secondary: '#FF6347', name: 'Red Alert' }
    };

    if (themes[theme]) {
      addLine(`<span style="color: ${themes[theme].primary}">Switching to ${themes[theme].name} theme...</span>`);
      
      document.documentElement.style.setProperty('--terminal-green', themes[theme].primary);
      document.documentElement.style.setProperty('--terminal-bright-green', themes[theme].secondary);
      
      setTimeout(() => {
        addLine(`<span style="color: ${themes[theme].primary}">Theme changed successfully!</span>`);
      }, 500);
    } else {
      addLine('<span class="text-terminal-red">Theme not found. Use "theme" to see available themes.</span>');
    }
  }, [addLine]);

  const showContact = useCallback(() => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
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
                    <a href="${cv.phone}" class="text-terminal-bright-green underline hover:text-terminal-yellow cursor-pointer">
                      ${cv.phone.replace(/[^\d\+]/g, '')}
                    </a>
                    </span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">🌐 SOCIAL NETWORKS</div>
            <div class="space-y-1 ml-2">
              ${cv.social_networks.map(social => {
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
            <div class="text-terminal-yellow font-bold mb-2">💡 LET'S CONNECT</div>
            <div class="space-y-1 ml-2 text-xs">
              <div class="text-white leading-relaxed bg-terminal-green/5 p-2 rounded">
                Feel free to reach out for collaborations, opportunities, or just to connect!
              </div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=about">about</a></span> to learn more about me</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> to see my work</div>
              <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> for my professional background</div>
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
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    addLine(`<span class="text-terminal-green">User:</span> <span class="text-white">${portfolioData.cv.name}</span>`);
    addLine(`<span class="text-terminal-green">Location:</span> <span class="text-white">${portfolioData.cv.location}</span>`);
    addLine(`<span class="text-terminal-green">Role:</span> <span class="text-white">${portfolioData.cv.sections.experience[0]?.position || 'Professional'}</span>`);
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
        addLine('Portfolio data not loaded', 'text-terminal-red');
        return;
      }

      const { cv } = portfolioData;
      
      const resumeBox = `
        <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
          <div class="border-b border-terminal-green/30 px-3 py-1">
            <div class="flex items-center justify-between">
              <span class="text-terminal-bright-green text-sm font-bold">RESUME.TXT</span>
              <button 
                onclick="toggleAllProjects('resume')" 
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
              <div class="text-terminal-bright-white font-bold text-lg mb-1">${cv.name}</div>
              <div class="text-terminal-green">${cv.location}</div>
              <div class="text-terminal-green">${cv.email} | ${cv.phone.replace(/[^\d\+]/g, '')}</div>
              ${cv.social_networks?.length > 0 ? `
                <div class="text-terminal-green">
                  ${cv.social_networks.map(social => `${social.network}: ${social.username}`).join(' | ')}
                </div>
              ` : ''}
            </div>

            ${cv.sections.intro?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-0')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">About</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-0-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-0" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-1">
                    ${cv.sections.intro.map(line => `
                      <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                        ${line}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections.technologies?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-1')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Technologies</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-1-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-1" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-1">
                    ${cv.sections.technologies.map(tech => `
                      <div class="text-white text-xs leading-relaxed bg-terminal-green/5 p-2 rounded">
                        <span class="text-terminal-yellow font-semibold">• ${tech.label}</span>
                        <span class="text-white"> - ${tech.details}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${cv.sections.experience?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-2')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Experience</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-2-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-2" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections.experience.map(exp => {
                      const endDate = exp.end_date || 'Present';
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

            ${cv.sections.education?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-3')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Education</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-3-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-3" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections.education.map(edu => `
                      <div class="bg-terminal-green/5 p-3 rounded">
                        <div class="text-terminal-yellow font-semibold">${edu.degree} in ${edu.area} from ${edu.institution}</div>
                        <div class="text-terminal-green">${edu.location}</div>
                        <div class="text-terminal-green">${edu.start_date} - ${edu.end_date}</div>
                        ${edu.highlights?.length > 0 ? `
                          <div class="space-y-1 mt-2">
                            ${edu.highlights.map(highlight => `
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

            ${cv.sections.selected_projects?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-4')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Professional Projects</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-4-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-4" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections.selected_projects.map(project => `
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

            ${cv.sections.personal_projects?.length > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-5')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Personal Projects</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-5-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-5" class="hidden border-t border-terminal-green/20 p-3 pt-2">
                  <div class="space-y-3">
                    ${cv.sections.personal_projects.map(project => `
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

            ${(cv.sections.publication?.length ?? 0) > 0 ? `
              <div class="border border-terminal-green/20 rounded">
                <div class="cursor-pointer hover:bg-terminal-green/10 transition-colors p-3" onclick="toggleProject('resume-project-6')">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span class="text-terminal-yellow font-semibold">Publications</span>
                    </div>
                    <div class="text-terminal-bright-green ml-2">
                      <span id="resume-project-6-icon">▶</span>
                    </div>
                  </div>
                </div>
                <div id="resume-project-6" class="hidden border-t border-terminal-green/20 p-3 pt-2">
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
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=about">about</a></span> for a formatted introduction</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=experience">experience</a></span> for detailed work history</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=projects">projects</a></span> for interactive project showcase</div>
                <div><span class="text-white">•</span> Try <span class="text-terminal-bright-green font-semibold"><a href="?cmd=skills">skills</a></span> for technology breakdown</div>
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

  const showNeofetch = useCallback(async () => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    // Check screen size
    const isMobile = window.innerWidth < 1106; // 1106px is the breakpoint for the big neofetch

    try {
      // Select file based on screen size
      const filePath = isMobile ? '/data/neofetch-small.txt' : '/data/neofetch.txt';

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
          // Convert spaces to &nbsp; for proper HTML display
          const htmlLine = line.replace(/ /g, '&nbsp;');
          addLine(`<span style="font-family: monospace !important;">${htmlLine}</span>`);
        }
      });
      
    } catch (error) {
      console.error('Error loading neofetch content:', error);
      addLine('Error loading neofetch content!', 'text-terminal-red');
    }
  }, [addLine, portfolioData]);

  const listCommands = useCallback(() => {
    addLine('<span class="text-terminal-yellow font-bold">Available commands:</span>');
    addLine('');
    const commands = ['help', 'about', 'skills', 'experience', 'education', 'projects', 'personal', 'contact', 'publications', 'timeline', 'search', 'theme', 'clear', 'whoami', 'ls', 'pwd', 'cat', 'neofetch'];
    commands.forEach(cmd => {
      addLine(`<span class="text-terminal-green">${cmd}</span>`);
    });
  }, [addLine]);

  const executeCommand = useCallback((command: string) => {
    if (!command.trim()) return;
    
    addLine(`guest@portfolio:~$ ${command}`, 'text-terminal-green font-bold', true);
    setCommandHistory(prev => [command, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    
    const args = command.trim().split(' ');
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        showHelp();
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
      case 'clear':
        clearTerminal();
        break;
      default:
        addLine(`bash: ${cmd}: command not found`, 'text-terminal-red');
        addLine("Type 'help' to see available commands", 'text-terminal-yellow');
    }
  }, [addLine, showHelp, showAbout, showSkills, showExperience, showEducation, showProjects, showPersonalProjects, showContact, showPublications, showTimeline, showSearch, showTheme, showWhoAmI, listCommands, showCat, showNeofetch, clearTerminal]);

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
    const commands = ['help', 'about', 'skills', 'experience', 'education', 'projects', 'personal', 'contact', 'publications', 'timeline', 'search', 'theme', 'clear', 'whoami', 'ls', 'pwd', 'cat', 'neofetch'];
    return commands.filter(cmd => cmd.startsWith(input.toLowerCase()));
  }, []);

  const getAllCommands = useCallback(() => {
    return ['help', 'about', 'skills', 'experience', 'education', 'projects', 'personal', 'contact', 'publications', 'timeline', 'search', 'theme', 'clear', 'whoami', 'ls', 'pwd', 'cat', 'neofetch'];
  }, []);

  return {
    lines,
    executeCommand,
    navigateHistory,
    getCommandSuggestions,
    getAllCommands,
    isTyping,
    currentInput,
    setCurrentInput,
    clearTerminal
  };
}