import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { Experience } from '../../../../shared/schema';
import { renderGuiMarkdown } from '../../lib/guiMarkdown';
import { accentRgba } from '../../config/gui-theme.config';

interface ExperienceCardProps {
  experience: Experience;
  index: number;
  total: number;
}

function formatDateRange(start: string, end?: string): string {
  const fmt = (d: string) => {
    const [year, month] = d.split('-');
    if (!month) return year;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };
  return `${fmt(start)} — ${end ? fmt(end) : 'Present'}`;
}

export default function ExperienceCard({ experience, index, total }: ExperienceCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });
  const [expanded, setExpanded] = useState(false);

  const rawSummary = (experience as Record<string, unknown>).summary;
  const summary = typeof rawSummary === 'string' ? rawSummary : '';

  const hasDetails = experience.highlights && experience.highlights.length > 0;

  const isLatest = index === 0;
  // Fade from full opacity (latest) to ~30% (oldest)
  const dotOpacity = total > 1 ? 1 - (index / (total - 1)) * 0.7 : 1;

  return (
    <motion.div
      ref={ref}
      className="relative pl-8 sm:pl-12 pb-10 last:pb-0"
      initial={{ opacity: 0, x: 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
    >
      {/* Timeline dot — bright and filled for latest, fading hollow for older */}
      <div
        className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 ${
          isLatest
            ? `border-gui-accent bg-gui-accent shadow-[0_0_8px_rgba(var(--gui-accent-rgb),0.5)]`
            : 'border-gui-accent bg-black'
        }`}
        style={{ opacity: dotOpacity }}
      />
      {/* Timeline line */}
      <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gui-accent/20" style={{ opacity: dotOpacity }} />

      <p className="text-gui-accent text-xs font-mono mb-1 tracking-wider">
        {formatDateRange(experience.start_date, experience.end_date)}
      </p>

      <h3 className="text-white text-xl sm:text-2xl font-bold">{experience.company}</h3>
      <p className="text-gui-accent text-sm mt-0.5">{experience.position}</p>
      {experience.location && (
        <p className="text-gui-text-muted text-xs mt-0.5">{experience.location}</p>
      )}

      {summary && (
        <p
          className="text-gui-text-muted text-sm mt-3 leading-relaxed max-w-2xl"
          dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(summary) }}
        />
      )}

      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-gui-accent text-xs font-mono hover:text-gui-accent-hover transition-colors flex items-center gap-1"
          >
            <span className="inline-block transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            {expanded ? 'Hide details' : `View details (${experience.highlights!.length})`}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-2 space-y-2 pl-3 border-l border-white/5"
              >
                {experience.highlights!.map((h, i) => (
                  <motion.li
                    key={i}
                    className="text-gui-text-muted text-sm leading-relaxed"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(h) }}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
