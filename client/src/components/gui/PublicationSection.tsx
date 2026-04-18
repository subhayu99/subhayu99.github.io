import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import ScrambleText from './ScrambleText';

interface PublicationSectionProps {
  data: PortfolioData;
}

export default function PublicationSection({ data }: PublicationSectionProps) {
  const publications = data.cv.sections.publication;
  if (!publications?.length) return null;

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });

  return (
    <SectionWrapper id="publication" watermark="RESEARCH" animation="fade-right">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <ScrambleText text="// publications" className="text-gui-accent font-mono text-sm" />
        <div className="flex-1 h-px bg-gui-accent/30" />
      </div>

      <div ref={ref} className="max-w-3xl space-y-6">
        {publications.map((pub, i) => (
          <motion.div
            key={pub.title}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <h3 className="text-white font-bold text-xl leading-snug">{pub.title}</h3>
            <p className="text-gui-text-muted text-sm mt-1">
              {pub.authors.join(', ')}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-gui-accent text-sm">{pub.journal}</span>
              {pub.doi && (
                <a
                  href={`https://doi.org/${pub.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-white text-xs transition-colors"
                >
                  DOI →
                </a>
              )}
            </div>
          </motion.div>
        ))}
        <span className="secret-text block mt-6 font-mono">// stuck in the maze? "help" unlocks it.</span>
      </div>
    </SectionWrapper>
  );
}
