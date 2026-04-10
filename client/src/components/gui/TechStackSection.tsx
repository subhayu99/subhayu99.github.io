import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import SkillConstellation from './SkillConstellation';
import ScrambleText from './ScrambleText';
import { useIsMobile } from '../../hooks/use-mobile';

// ── Configurable SVG icons per skill category ──
// All use currentColor (follows theme). Add new keys matching skill-graph.json group keys.
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  lang: ( // code brackets
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7,4 3,10 7,16" /><polyline points="13,4 17,10 13,16" /><line x1="11" y1="5" x2="9" y2="15" />
    </svg>
  ),
  data: ( // pipeline split
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="10" r="2" /><circle cx="16" cy="5" r="2" /><circle cx="16" cy="15" r="2" />
      <line x1="6" y1="9" x2="14" y2="5" /><line x1="6" y1="11" x2="14" y2="15" />
    </svg>
  ),
  db: ( // database cylinder
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="10" cy="5" rx="7" ry="3" /><path d="M3,5 v10 c0,1.66 3.13,3 7,3 s7-1.34 7-3 V5" /><ellipse cx="10" cy="10" rx="7" ry="3" />
    </svg>
  ),
  ai: ( // neural hub
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" /><circle cx="10" cy="3" r="1.5" /><circle cx="16" cy="7" r="1.5" /><circle cx="16" cy="14" r="1.5" /><circle cx="10" cy="17" r="1.5" /><circle cx="4" cy="14" r="1.5" /><circle cx="4" cy="7" r="1.5" />
      <line x1="10" y1="7.5" x2="10" y2="4.5" /><line x1="12.2" y1="8.2" x2="14.5" y2="7" /><line x1="12.2" y1="11.8" x2="14.5" y2="14" /><line x1="10" y1="12.5" x2="10" y2="15.5" /><line x1="7.8" y1="11.8" x2="5.5" y2="14" /><line x1="7.8" y1="8.2" x2="5.5" y2="7" />
    </svg>
  ),
  cloud: ( // cloud with arrows
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3,13 Q3,7 10,7 Q17,7 17,13" /><line x1="6" y1="13" x2="6" y2="17" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="13" x2="14" y2="17" />
    </svg>
  ),
  app: ( // monitor
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="16" height="11" rx="1.5" /><line x1="2" y1="7" x2="18" y2="7" /><line x1="7" y1="17" x2="13" y2="17" /><line x1="10" y1="14" x2="10" y2="17" />
    </svg>
  ),
};

interface TechStackSectionProps {
  data: PortfolioData;
}

function TechCategory({ label, details, index }: { label: string; details: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-30px' });
  const techs = details.split(',').map(t => t.trim());

  return (
    <motion.div
      ref={ref}
      className="group"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
    >
      {/* Category label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-gui-accent font-mono text-xs tracking-widest uppercase">
          {label}
        </span>
        <div className="flex-1 h-px bg-white/5 group-hover:bg-gui-accent/20 transition-colors duration-500" />
        <span className="text-zinc-600 font-mono text-[10px]">{techs.length}</span>
      </div>

      {/* Tech pills */}
      <div className="flex flex-wrap gap-2">
        {techs.map((tech, i) => (
          <motion.span
            key={tech}
            className="px-3 py-1.5 text-sm font-mono text-gui-text-muted border border-white/5
                       hover:border-gui-accent/40 hover:text-gui-accent hover:bg-gui-accent/5
                       transition-all duration-200 cursor-default select-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.15 + i * 0.03 }}
          >
            {tech}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SkillGraphData = any;

export default function TechStackSection({ data }: TechStackSectionProps) {
  const technologies = data.cv.sections.technologies;
  const [graphData, setGraphData] = useState<SkillGraphData | null>(null);
  const [viewMode, setViewMode] = useState<'constellation' | 'pills'>('constellation');
  const isMobile = useIsMobile();

  // Try loading skill-graph.json (personal-only asset)
  useEffect(() => {
    fetch('/data/skill-graph.json')
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d) => setGraphData(d))
      .catch(() => setGraphData(null));
  }, []);

  if (!technologies?.length) return null;

  const hasConstellation = !!graphData;
  const showConstellation = hasConstellation && viewMode === 'constellation' && !isMobile;

  return (
    <SectionWrapper id="skills" watermark="SKILLS" animation="split-open">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <ScrambleText text="// tech stack" className="text-gui-accent font-mono text-sm" />
        <div className="flex-1 h-px bg-gui-accent/30" />
        {hasConstellation && !isMobile && (
          <div className="flex gap-1 text-[10px] font-mono">
            <button
              onClick={() => setViewMode('constellation')}
              className={`px-2 py-1 border transition-colors ${viewMode === 'constellation' ? 'border-gui-accent/50 text-gui-accent' : 'border-white/10 text-zinc-500 hover:text-zinc-300'}`}
            >
              graph
            </button>
            <button
              onClick={() => setViewMode('pills')}
              className={`px-2 py-1 border transition-colors ${viewMode === 'pills' ? 'border-gui-accent/50 text-gui-accent' : 'border-white/10 text-zinc-500 hover:text-zinc-300'}`}
            >
              list
            </button>
          </div>
        )}
      </div>

      {showConstellation ? (
        <SkillConstellation data={graphData} />
      ) : hasConstellation && (isMobile || viewMode === 'pills') && graphData ? (
        // Grouped pills from skill-graph data — richer grouping with colors
        <div className="space-y-8 max-w-4xl">
          {Object.entries(graphData.groups as Record<string, { label: string; color: string }>).map(
            ([groupKey, group], gi) => {
              const groupNodes = (graphData.nodes as Array<{ id: string; label: string; group: string; size: number }>)
                .filter((n) => n.group === groupKey);
              if (groupNodes.length === 0) return null;
              return (
                <motion.div
                  key={groupKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: gi * 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {CATEGORY_ICONS[groupKey] && (
                      <span className="w-[18px] h-[18px] shrink-0 text-gui-accent opacity-70">
                        {CATEGORY_ICONS[groupKey]}
                      </span>
                    )}
                    <span className="text-gui-accent font-mono text-xs tracking-widest uppercase">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-zinc-600 font-mono text-[10px]">{groupNodes.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupNodes.map((node, i) => (
                      <motion.span
                        key={node.id}
                        className="px-3 py-1.5 text-sm font-mono text-gui-text-muted border border-white/5
                                   hover:border-gui-accent/40 hover:text-gui-accent hover:bg-gui-accent/5
                                   transition-all duration-200 cursor-default select-none"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: gi * 0.1 + i * 0.02 }}
                      >
                        {node.label}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              );
            }
          )}
        </div>
      ) : (
        // Fallback: pills from resume YAML data
        <div className="space-y-8 max-w-4xl">
          {technologies.map((tech, i) => (
            <TechCategory key={tech.label} label={tech.label} details={tech.details} index={i} />
          ))}
        </div>
      )}
    </SectionWrapper>
  );
}
