import { useRef, useState, useMemo, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { PortfolioData, Project } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import { renderGuiMarkdown, extractMetric } from '../../lib/guiMarkdown';
import ScrambleText from './ScrambleText';

interface ProfessionalProjectsSectionProps {
  data: PortfolioData;
}

function extractYear(date: string): string {
  const match = date.match(/\b(20\d{2})\b/);
  return match ? match[1] : '';
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-30px' });

  const firstHighlight = project.highlights[0] ?? '';
  const remainingHighlights = project.highlights.slice(1);

  return (
    <motion.div
      ref={ref}
      className="bg-white/[0.04] backdrop-blur-md border border-white/5 p-5 flex flex-col hover:border-gui-accent/30 transition-colors duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.08 }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-white font-bold text-base leading-snug">{project.name}</h3>
      </div>

      <p className="text-gui-accent text-xs font-mono mb-3">{project.date}</p>

      <p
        className="text-gui-text-muted text-sm leading-relaxed mb-3 flex-1"
        dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(firstHighlight) }}
      />

      {remainingHighlights.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gui-accent text-xs font-mono hover:text-gui-accent-hover transition-colors flex items-center gap-1"
          >
            <span className="inline-block transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            {expanded ? 'Less' : `+${remainingHighlights.length} more`}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-2 space-y-2 pl-3 border-l border-white/5"
              >
                {remainingHighlights.map((h, i) => (
                  <p
                    key={i}
                    className="text-gui-text-muted text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(h) }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export default function ProfessionalProjectsSection({ data }: ProfessionalProjectsSectionProps) {
  const projects = data.cv.sections.professional_projects;
  if (!projects?.length) return null;

  const [activeYear, setActiveYear] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const INITIAL_COUNT = isMobile ? 3 : 6;

  const years = useMemo(() => {
    const yrs = [...new Set(projects.map(p => extractYear(p.date)))].filter(Boolean).sort().reverse();
    return ['All', ...yrs];
  }, [projects]);

  const yearFiltered = activeYear === 'All'
    ? projects
    : projects.filter(p => extractYear(p.date) === activeYear);

  const filtered = showAll || activeYear !== 'All'
    ? yearFiltered
    : yearFiltered.slice(0, INITIAL_COUNT);

  const hasMore = activeYear === 'All' && yearFiltered.length > INITIAL_COUNT;

  return (
    <SectionWrapper id="work" watermark="WORK" animation="scale-up">
      {/* Label */}
      <div className="flex items-center gap-4 mb-6">
        <ScrambleText text="// professional projects" className="text-gui-accent font-mono text-sm" />
        <div className="flex-1 h-px bg-gui-accent/30" />
      </div>

      {/* Year filter tabs */}
      {years.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors duration-200 ${
                activeYear === year
                  ? 'bg-gui-accent text-black'
                  : 'text-zinc-500 hover:text-white border border-white/10'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {filtered.map((project, i) => (
          <ProjectCard key={project.name} project={project} index={i} />
        ))}
      </div>

      {/* Show more / less toggle */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-2.5 text-sm font-mono border border-gui-accent/30 text-gui-accent hover:bg-gui-accent/10 hover:border-gui-accent/60 transition-all duration-200 rounded-sm flex items-center gap-2"
          >
            <span className="inline-block transition-transform duration-200" style={{ transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            {showAll ? 'Show less' : `Show all ${yearFiltered.length} projects`}
          </button>
        </div>
      )}
    </SectionWrapper>
  );
}
