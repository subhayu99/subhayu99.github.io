import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import SkillConstellation from './SkillConstellation';

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

  // Try loading skill-graph.json (personal-only asset)
  useEffect(() => {
    fetch('/data/skill-graph.json')
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d) => setGraphData(d))
      .catch(() => setGraphData(null));
  }, []);

  if (!technologies?.length) return null;

  const hasConstellation = !!graphData;

  return (
    <SectionWrapper id="skills" watermark="SKILLS" animation="split-open">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <span className="text-gui-accent font-mono text-sm">// tech stack</span>
        <div className="flex-1 h-px bg-gui-accent/30" />
        {hasConstellation && (
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

      {hasConstellation && viewMode === 'constellation' ? (
        <SkillConstellation data={graphData} />
      ) : (
        <div className="space-y-8 max-w-4xl">
          {technologies.map((tech, i) => (
            <TechCategory key={tech.label} label={tech.label} details={tech.details} index={i} />
          ))}
        </div>
      )}
    </SectionWrapper>
  );
}
