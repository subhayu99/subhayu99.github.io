import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '../../../../shared/schema';
import type { PyPIPackageStats } from '../../lib/pypiStats';
import { renderGuiMarkdown } from '../../lib/guiMarkdown';
import Sparkline from './Sparkline';

interface ProjectCardProps {
  project: Project;
  index: number;
  stats?: PyPIPackageStats;
}

function extractUrl(highlights: string[], label: string): string | null {
  for (const h of highlights) {
    const match = h.match(new RegExp(`\\[${label}\\]\\((https?:\\/\\/[^)]+)\\)`));
    if (match) return match[1];
  }
  return null;
}

function formatDownloads(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

export default function ProjectCard({ project, index, stats }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const githubUrl = extractUrl(project.highlights, 'GitHub');
  const pypiUrl = extractUrl(project.highlights, 'PyPI');
  const docsUrl = extractUrl(project.highlights, 'documentation');

  const firstHighlight = project.highlights[0] ?? '';
  const remainingHighlights = project.highlights.slice(1);

  // Real download count from API, fallback to text extraction
  const downloadCount = stats?.total_all_time;
  const downloadLabel = stats && downloadCount
    ? `${formatDownloads(downloadCount)} downloads`
    : null;

  // Fallback: extract from text if no API stats
  const textDownloads = (() => {
    if (stats) return null;
    for (const h of project.highlights) {
      const match = h.match(/(\d+[\d,.]*[kK]\+?)\s*(?:PyPI\s*)?downloads/i);
      if (match) return match[1];
    }
    return null;
  })();

  return (
    <motion.div
      className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white/[0.04] backdrop-blur-md border border-white/5 p-6 flex flex-col"
      whileHover={{ scale: 1.02, borderColor: 'rgba(245, 158, 11, 0.3)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-white font-bold text-lg">{project.name}</h3>
      </div>
      <p className="text-gui-accent text-xs font-mono mb-3">{project.date}</p>

      <p
        className="text-gui-text-muted text-sm leading-relaxed mb-3"
        dangerouslySetInnerHTML={{ __html: renderGuiMarkdown(firstHighlight) }}
      />

      {remainingHighlights.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gui-accent text-xs font-mono hover:text-gui-accent-hover transition-colors flex items-center gap-1 mb-3"
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
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2 mb-3"
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

      {/* Sparkline chart */}
      {stats && stats.weekly.length > 2 && (
        <div className="mb-3 mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Downloads / week</span>
            <span className="text-[10px] text-gui-accent font-mono">
              {stats.last_month}/mo
            </span>
          </div>
          <Sparkline data={stats.weekly} width={268} height={36} />
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        {(downloadLabel || textDownloads) && (
          <span className="text-gui-accent text-xs font-mono">
            {downloadLabel ?? `${textDownloads} downloads`}
          </span>
        )}
        <div className="flex items-center gap-3 ml-auto">
          {pypiUrl && (
            <a href={pypiUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-gui-accent text-xs transition-colors">PyPI</a>
          )}
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-gui-accent text-xs transition-colors">Docs</a>
          )}
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white text-xs transition-colors">GitHub →</a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
