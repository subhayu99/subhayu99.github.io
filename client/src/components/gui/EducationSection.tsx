import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import ScrambleText from './ScrambleText';

interface EducationSectionProps {
  data: PortfolioData;
}

function extractCGPA(highlights?: string[]): string | null {
  if (!highlights) return null;
  for (const h of highlights) {
    const match = h.match(/CGPA[:\s]*(\d+\.?\d*\/\d+)/i);
    if (match) return match[1];
  }
  return null;
}

interface HighlightItem {
  label: string;
  url: string | null;
}

function extractNotableHighlights(highlights?: string[]): HighlightItem[] {
  if (!highlights) return [];
  return highlights
    .filter(h => !h.match(/CGPA/i))
    .map(h => {
      // Handle both **bold** markdown and <b>bold</b> HTML
      const boldMatch = h.match(/\*\*(.*?)\*\*/) ?? h.match(/<b>(.*?)<\/b>/);
      const label = boldMatch ? boldMatch[1].replace(/\(.*?\)/, '').replace(/:$/, '').trim() : null;
      const linkMatch = h.match(/\[.*?\]\((https?:\/\/[^)]+)\)/) ?? h.match(/href="(https?:\/\/[^"]+)"/);
      const url = linkMatch ? linkMatch[1] : null;
      return label ? { label, url } : null;
    })
    .filter(Boolean) as HighlightItem[];
}

export default function EducationSection({ data }: EducationSectionProps) {
  const education = data.cv.sections.education;
  if (!education?.length) return null;

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });

  return (
    <SectionWrapper id="education" watermark="EDUCATION" animation="blur-rise">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <ScrambleText text="// education" className="text-gui-accent font-mono text-sm" />
        <div className="flex-1 h-px bg-gui-accent/30" />
      </div>

      <div ref={ref} className="max-w-3xl space-y-6">
        {education.map((edu, i) => {
          const cgpa = extractCGPA(edu.highlights);
          const notable = extractNotableHighlights(edu.highlights);

          return (
            <motion.div
              key={edu.institution}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="text-white text-xl font-bold">{edu.institution}</h3>
                <span className="text-gui-text-muted text-sm">
                  {edu.degree} in {edu.area}
                </span>
                <span className="text-gui-accent text-xs font-mono">
                  {edu.start_date.split('-')[0]}–{edu.end_date.split('-')[0]}
                  {cgpa && ` · ${cgpa}`}
                </span>
              </div>

              {notable.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {notable.map((item) =>
                    item.url ? (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gui-accent text-xs hover:text-gui-accent-hover hover:underline underline-offset-2 transition-colors"
                      >
                        {item.label} →
                      </a>
                    ) : (
                      <span key={item.label} className="text-gui-accent text-xs">
                        {item.label}
                      </span>
                    )
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
        <span className="secret-text block mt-4 font-mono">// still curious? try typing "snake" or "reflex" anywhere on the page</span>
      </div>
    </SectionWrapper>
  );
}
