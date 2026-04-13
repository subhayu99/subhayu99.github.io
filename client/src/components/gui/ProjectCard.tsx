import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '../../../../shared/schema';
import type { PyPIPackageStats } from '../../lib/pypiStats';
import { renderGuiMarkdown } from '../../lib/guiMarkdown';
const accentRgba = (o: number) => `rgba(var(--gui-accent-rgb), ${o})`;
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
  const highlights = project.highlights ?? [];
  const githubUrl = extractUrl(highlights, 'GitHub');
  const pypiUrl = extractUrl(highlights, 'PyPI');
  const docsUrl = extractUrl(highlights, 'documentation');

  const firstHighlight = highlights[0] ?? '';
  const remainingHighlights = highlights.slice(1);

  // Real download count from API, fallback to text extraction
  const downloadCount = stats?.total_all_time;
  const downloadLabel = stats && downloadCount
    ? `${formatDownloads(downloadCount)} downloads`
    : null;

  // Fallback: extract from text if no API stats
  const textDownloads = (() => {
    if (stats) return null;
    for (const h of highlights) {
      const match = h.match(/(\d+[\d,.]*[kK]\+?)\s*(?:PyPI\s*)?downloads/i);
      if (match) return match[1];
    }
    return null;
  })();

  return (
    <motion.div
      className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white/[0.04] backdrop-blur-md border border-white/5 p-6 flex flex-col"
      whileHover={{ scale: 1.02, borderColor: accentRgba(0.3) }}
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
            <a href={pypiUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-gui-accent transition-colors" title="PyPI">
              <svg width="16" height="16" viewBox="0 0 256 255" fill="currentColor"><path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"/><path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"/></svg>
            </a>
          )}
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-gui-accent transition-colors" title="Documentation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>
            </a>
          )}
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" title="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
