import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import { renderGuiMarkdown } from '../../lib/guiMarkdown';
import ScrambleText from './ScrambleText';

interface AboutSectionProps {
  data: PortfolioData;
}

export default function AboutSection({ data }: AboutSectionProps) {
  const intro = data.cv.sections.intro;
  if (!intro?.length) return null;

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-60px' });

  return (
    <SectionWrapper id="about" watermark="ABOUT" animation="fade-left">
      <div ref={ref} className="max-w-3xl">
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ScrambleText text="// about" className="text-gui-accent font-mono text-sm" />
          <div className="flex-1 h-px bg-gui-accent/30" />
        </motion.div>

        {intro.map((paragraph, i) => (
          <motion.p
            key={i}
            className="text-gui-text-muted text-base leading-relaxed mb-4 last:mb-0"
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(paragraph) }}
          />
        ))}
        <span className="secret-text block mt-4 font-mono">// you found a secret. spell what slithers (5 keys) and something hisses. more hides around — keep selecting.</span>
      </div>
    </SectionWrapper>
  );
}
