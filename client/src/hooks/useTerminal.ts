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
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow">
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
      <div class="border border-terminal-green/50 rounded-sm mb-4 terminal-glow">
        <div class="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span class="text-terminal-bright-green text-sm font-bold">TECHNICAL SKILLS & TECHNOLOGIES</span>
        </div>
        <div class="p-3 space-y-3 text-xs sm:text-sm">
          <div>
            <div class="text-terminal-bright-green font-bold mb-2">🛠️ TECHNOLOGY STACK</div>
            <div class="space-y-2 ml-2">
              ${portfolioData.cv.sections.technologies.map(tech => `
                <div class="grid grid-cols-12 gap-4">
                  <div class="col-span-3 bg-terminal-green/10 p-2 rounded">
                    <span class="text-terminal-yellow font-semibold">${tech.label}</span>
                  </div>
                  <div class="col-span-9 bg-terminal-green/5 p-2 rounded">
                    <span class="text-white">${tech.details}</span>
                  </div>
                </div>
              `).join('')}
            </div>
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

    // addLine('<span class="text-terminal-bright-green">Research Publications:</span>');
    // addLine('');
    
    portfolioData.cv.sections.publication.forEach((pub, index) => {
      setTimeout(() => {
        addLine(`<span class="text-terminal-green">${pub.title}</span>`);
        addLine(`<span class="text-white opacity-80">Authors: ${pub.authors.join(', ')}</span>`);
        addLine(`<span class="text-white opacity-80">Journal: ${pub.journal}</span>`);
        addLine(`<span class="text-white opacity-80">Date: ${pub.date}</span>`);
        if (pub.doi) {
          addLine(`<span class="text-white opacity-80 cursor-pointer">DOI: https://doi.org/${pub.doi}</span>`);
        }
        addLine('');
      }, index * 200);
    });
  }, [addLine, portfolioData]);

  const showTimeline = useCallback(() => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    addLine('<span class="text-terminal-bright-green">Career Timeline:</span>');
    addLine('');

    const timelineEvents: Array<{date: string, type: string, title: string, endDate?: string}> = [];
    
    portfolioData.cv.sections.education.forEach(edu => {
      timelineEvents.push({
        date: edu.start_date,
        type: 'education',
        title: `Started ${edu.degree} in ${edu.area} at ${edu.institution}`,
        endDate: edu.end_date
      });
    });

    portfolioData.cv.sections.experience.forEach(exp => {
      timelineEvents.push({
        date: exp.start_date,
        type: 'experience',
        title: `${exp.position} at ${exp.company}`,
        endDate: exp.end_date
      });
    });

    portfolioData.cv.sections.selected_projects.forEach(proj => {
      timelineEvents.push({
        date: proj.date.split(' – ')[0].replace(/[A-Za-z ]/g, ''),
        type: 'project',
        title: proj.name
      });
    });

    timelineEvents.sort((a, b) => {
      const dateA = a.date.replace(/[^0-9]/g, '');
      const dateB = b.date.replace(/[^0-9]/g, '');
      return dateA.localeCompare(dateB);
    });

    timelineEvents.forEach((event, index) => {
      setTimeout(() => {
        const icon = event.type === 'education' ? '🎓' : event.type === 'experience' ? '💼' : '🚀';
        const color = event.type === 'education' ? 'text-terminal-bright-green' : event.type === 'experience' ? 'text-terminal-green' : 'text-white';
        
        addLine(`<span class="${color}">${event.date} ${icon} ${event.title}</span>`);
        if (event.endDate && event.endDate !== event.date) {
          addLine(`<span class="text-white opacity-60">  └─ Ended: ${event.endDate}</span>`);
        }
        addLine('');
      }, index * 150);
    });
  }, [addLine, portfolioData]);

  const showSearch = useCallback((args: string[]) => {
    if (!portfolioData) {
      addLine('Portfolio data not loaded', 'text-terminal-red');
      return;
    }

    const searchTerm = args.join(' ').toLowerCase();
    if (!searchTerm) {
      addLine('<span class="text-terminal-yellow">Usage: search [term]</span>');
      addLine('<span class="text-white">Example: search python</span>');
      return;
    }

    addLine(`<span class="text-terminal-bright-green">Searching for: "${searchTerm}"</span>`);
    addLine('');

    const results: string[] = [];
    const { cv } = portfolioData;

    cv.sections.intro.forEach((intro, i) => {
      if (intro.toLowerCase().includes(searchTerm)) {
        results.push(`About (intro ${i + 1}): ${intro.substring(0, 100)}...`);
      }
    });

    cv.sections.technologies.forEach(tech => {
      if (tech.label.toLowerCase().includes(searchTerm) || tech.details.toLowerCase().includes(searchTerm)) {
        results.push(`Skills: ${tech.label} - ${tech.details}`);
      }
    });

    cv.sections.experience.forEach(exp => {
      const searchableText = `${exp.company} ${exp.position} ${exp.location} ${exp.highlights.join(' ')}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push(`Experience: ${exp.position} at ${exp.company}`);
      }
    });

    cv.sections.selected_projects.forEach(proj => {
      const searchableText = `${proj.name} ${proj.highlights.join(' ')}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push(`Project: ${proj.name}`);
      }
    });

    cv.sections.personal_projects.forEach(proj => {
      const searchableText = `${proj.name} ${proj.highlights.join(' ')}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push(`Personal Project: ${proj.name}`);
      }
    });

    if (results.length === 0) {
      addLine('<span class="text-terminal-yellow">No results found</span>');
    } else {
      addLine(`<span class="text-terminal-green">Found ${results.length} result(s):</span>`);
      addLine('');
      results.forEach((result, index) => {
        setTimeout(() => {
          addLine(`<span class="text-white">• ${result}</span>`);
        }, index * 100);
      });
    }
  }, [addLine, portfolioData]);

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
    
    addLine('<span class="text-terminal-bright-green font-bold text-lg">📞 Contact Information</span>');
    addLine('');
    addLine('<span class="text-terminal-bright-green">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>');
    addLine('');
    addLine(`<span class="text-terminal-green font-semibold">Name:</span> <span class="text-white">${cv.name}</span>`);
    addLine(`<span class="text-terminal-green font-semibold">Location:</span> <span class="text-white">${cv.location}</span>`);
    addLine(`<span class="text-terminal-green font-semibold">Email:</span> <span class="text-white">${cv.email}</span>`);
    addLine(`<span class="text-terminal-green font-semibold">Phone:</span> <span class="text-white">${cv.phone.replace(/[^\d\+]/g, '')}</span>`);
    addLine('');
    addLine('<span class="text-terminal-bright-green font-bold">🌐 Social Networks & Links:</span>');
    addLine('');
    
    cv.social_networks.forEach(social => {
      const url = getSocialNetworkUrl(social.network, social.username);
      addLine(`  <span class="text-terminal-green">•</span> <span class="text-terminal-yellow font-semibold">${social.network}:</span> [${social.username}](${url})`);
    });
    
    addLine('');
    addLine('<span class="text-terminal-yellow">💡 All links above are clickable!</span>');
    addLine('');
    addLine('<span class="text-terminal-green">Feel free to reach out for collaborations, opportunities, or just to connect!</span>');
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
      addLine('<span class="text-terminal-yellow">Usage: cat [filename]</span>');
      addLine('<span class="text-white">Available files: resume.txt</span>');
      return;
    }

    if (filename === 'resume.txt') {
      if (!portfolioData) {
        addLine('Portfolio data not loaded', 'text-terminal-red');
        return;
      }

      const { cv } = portfolioData;
      
      // Header
      addLine('<span class="text-terminal-bright-green">=== RESUME.TXT ===</span>');
      addLine('');
      
      // Personal Info
      addLine(`<span class="text-terminal-bright-white font-bold">${cv.name}</span>`);
      addLine(`<span class="text-terminal-blue">${cv.location}</span>`);
      addLine(`<span class="text-terminal-blue">${cv.email} | ${cv.phone.replace(/[^\d\+]/g, '')}</span>`);
      
      // Social Networks
      if (cv.social_networks?.length > 0) {
        const socials = cv.social_networks.map(social => 
          `${social.network}: ${social.username}`
        ).join(' | ');
        addLine(`<span class="text-terminal-blue">${socials}</span>`);
      }
      addLine('');

      // Intro
      if (cv.sections.intro?.length > 0) {
        addLine('<span class="text-terminal-green">ABOUT:</span>');
        cv.sections.intro.forEach(line => {
          addLine(`<span class="text-terminal-white">${line}</span>`);
        });
        addLine('');
      }

      // Technologies
      if (cv.sections.technologies?.length > 0) {
        addLine('<span class="text-terminal-green">TECHNOLOGIES:</span>');
        cv.sections.technologies.forEach(tech => {
          addLine(`<span class="text-terminal-yellow">• ${tech.label}</span> - <span class="text-terminal-white">${tech.details}</span>`);
        });
        addLine('');
      }

      // Experience
      if (cv.sections.experience?.length > 0) {
        addLine('<span class="text-terminal-green">EXPERIENCE:</span>');
        cv.sections.experience.forEach(exp => {
          const endDate = exp.end_date || 'Present';
          addLine(`<span class="text-terminal-yellow">${exp.position}</span> @ <span class="text-terminal-cyan">${exp.company}</span>`);
          addLine(`<span class="text-terminal-blue">${exp.location} | ${exp.start_date} - ${endDate}</span>`);
          
          if (exp.highlights?.length > 0) {
            exp.highlights.forEach(highlight => {
              addLine(`  <span class="text-terminal-white">• ${highlight}</span>`);
            });
          }
          addLine('');
        });
      }

      // Education
      if (cv.sections.education?.length > 0) {
        addLine('<span class="text-terminal-green">EDUCATION:</span>');
        cv.sections.education.forEach(edu => {
          addLine(`<span class="text-terminal-yellow">${edu.degree} in ${edu.area}</span>`);
          addLine(`<span class="text-terminal-cyan">${edu.institution}</span> - <span class="text-terminal-blue">${edu.location}</span>`);
          addLine(`<span class="text-terminal-blue">${edu.start_date} - ${edu.end_date}</span>`);
          
          if (edu.highlights?.length > 0) {
            edu.highlights.forEach(highlight => {
              addLine(`  <span class="text-terminal-white">• ${highlight}</span>`);
            });
          }
          addLine('');
        });
      }

      // Professional Projects
      if (cv.sections.selected_projects?.length > 0) {
        addLine('<span class="text-terminal-green">PROFESSIONAL PROJECTS:</span>');
        cv.sections.selected_projects.forEach(project => {
          addLine(`<span class="text-terminal-yellow">${project.name}</span> <span class="text-terminal-blue">(${project.date})</span>`);
          
          if (project.highlights?.length > 0) {
            project.highlights.forEach(highlight => {
              addLine(`  <span class="text-terminal-white">• ${highlight}</span>`);
            });
          }
          addLine('');
        });
      }

      // Personal Projects
      if (cv.sections.personal_projects?.length > 0) {
        addLine('<span class="text-terminal-green">PERSONAL PROJECTS:</span>');
        cv.sections.personal_projects.forEach(project => {
          addLine(`<span class="text-terminal-yellow">${project.name}</span> <span class="text-terminal-blue">(${project.date})</span>`);
          
          if (project.highlights?.length > 0) {
            project.highlights.forEach(highlight => {
              addLine(`  <span class="text-terminal-white">• ${highlight}</span>`);
            });
          }
          addLine('');
        });
      }

      // Publications (if any)
      if ((cv.sections.publication?.length ?? 0) > 0) {
        addLine('<span class="text-terminal-green">PUBLICATIONS:</span>');
        if (cv.sections.publication) {
          cv.sections.publication.forEach(pub => {
            addLine(`<span class="text-terminal-yellow">${pub.title}</span>`);
            addLine(`<span class="text-terminal-cyan">${pub.authors.join(', ')}</span>`);
            addLine(`<span class="text-terminal-blue">${pub.journal} (${pub.date})</span>`);
            if (pub.doi) {
              addLine(`<span class="text-terminal-blue">DOI: ${pub.doi}</span>`);
            }
            addLine('');
          });
        }
      }
    } else {
      addLine(`<span class="text-terminal-red">cat: ${filename}: No such file or directory</span>`);
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
    addLine('<span class="text-terminal-bright-green">Available commands:</span>');
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