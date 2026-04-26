import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiConfig } from '../../config';
import { templateConfig } from '../../generated/template-config';
import AIPromptSheet from './AIPromptSheet';

interface ReplicateSheetProps {
  active: boolean;
  onClose: () => void;
}

interface ShowcaseEntry {
  owner: string;
  avatar: string;
  repo: string;
  repo_url: string;
  site_url: string;
  has_pages: boolean;
  stars: number;
  pushed_at: string;
}

interface TemplateStats {
  stars: number;
  forks: number;
  deployed_forks: number;
  orphan_derivatives: number | null;
  since: string;
  showcase: ShowcaseEntry[];
}

interface CTA {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Step {
  label: string;
  detail: string;
  ctas?: CTA[];
}

const buildSteps = (openAIPrompt: () => void): Step[] => [
  {
    label: 'Get your resume.yaml',
    detail:
      'paste the AI prompt into ChatGPT / Claude / Gemini with your existing resume — get back valid yaml in seconds. or start fresh in the RenderCV builder. or write it by hand against the schema.',
    ctas: [
      { label: 'AI prompt →', onClick: openAIPrompt },
      { label: 'RenderCV builder →', href: templateConfig.docs.renderCv },
      { label: 'Schema →', href: templateConfig.docs.advanced },
    ],
  },
  {
    label: 'Fork this repo',
    detail: 'rename to <your-username>.github.io · keep "copy main branch only" checked',
    ctas: [{ label: 'Fork →', href: templateConfig.site.templateForkUrl }],
  },
  {
    label: 'Enable Actions + Pages',
    detail: 'settings → actions → general · settings → pages → source: deploy from actions',
  },
  {
    label: 'Drop in your resume.yaml',
    detail: 'CI builds the PDF, generates JSON data, and deploys — no local install needed',
  },
  {
    label: 'Pull future engine updates',
    detail: 'git fetch upstream main && git merge upstream/main',
    ctas: [{ label: 'UPGRADING.md →', href: templateConfig.docs.upgrading }],
  },
];

/**
 * ReplicateSheet — editorial-style overlay for the GUI side.
 *
 * Triggered by keyword (`fork` / `replicate` / `clone`) or hash deep-link.
 * Mirrors HelpSheet's chrome (full-screen overlay, ESC to close, click outside)
 * and the hero/stat-card typography from the rest of the GUI: amber accent,
 * wide letter-spacing on small caps, condensed display font for the headline
 * number, mono everywhere else.
 */
export default function ReplicateSheet({ active, onClose }: ReplicateSheetProps) {
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const STEPS = buildSteps(() => setAiPromptOpen(true));

  useEffect(() => {
    // While the nested AIPromptSheet is open it owns ESC handling — without
    // this guard, ESC would close both sheets at once.
    if (!active || aiPromptOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose, aiPromptOpen]);

  // Lazy-load stats once the sheet is opened
  useEffect(() => {
    if (!active || stats) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiConfig.basePath}/template-stats.json`);
        if (!res.ok) return;
        const text = await res.text();
        if (text.trimStart().startsWith('<!DOCTYPE')) return;
        const data = JSON.parse(text);
        if (!cancelled) setStats(data);
      } catch {
        /* silently skip — stats are nice-to-have */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, stats]);

  const headline =
    stats && (stats.deployed_forks > 0 ? stats.deployed_forks : stats.forks);
  const sinceYear = stats?.since
    ? new Date(stats.since).getFullYear()
    : null;
  const deployed = stats?.showcase.filter((f) => f.has_pages) ?? [];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
          style={{
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-3xl w-full my-auto border border-[rgba(var(--gui-accent-rgb),0.35)] bg-black p-6 sm:p-10 font-mono text-gui-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[14px] leading-none text-zinc-500 hover:text-gui-accent transition-colors"
              aria-label="Close"
              title="Close (ESC)"
            >
              ✕
            </button>

            {/* ── Hero ── */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent">
                Replicate
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <h2 className="font-display text-white leading-[0.9] tracking-tight text-5xl sm:text-7xl mb-2">
              Build your own
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5 max-w-xl">
              this site is a template — fork it, drop in a{' '}
              <span className="text-white">resume.yaml</span>, and you have a
              terminal-style portfolio deployed to GitHub Pages in under ten minutes.
            </p>

            {/* Headline count + stats line */}
            <div className="flex items-end gap-4 sm:gap-6 mb-1 mt-6 pb-1 border-b border-white/5">
              <div className="font-display text-gui-accent leading-none tabular-nums text-5xl sm:text-6xl">
                {headline != null ? `${headline}+` : '—'}
              </div>
              <div className="pb-1.5 sm:pb-2 text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                developers
                <br />
                building with this
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-500 mb-8 mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <Stat label="stars" value={stats?.stars} />
              <span className="text-zinc-700">/</span>
              <Stat label="forks" value={stats?.forks} />
              <span className="text-zinc-700">/</span>
              <Stat label="deployed" value={stats?.deployed_forks} />
              {sinceYear && (
                <>
                  <span className="text-zinc-700">/</span>
                  <span>
                    since <span className="text-gui-accent">{sinceYear}</span>
                  </span>
                </>
              )}
            </div>

            {/* ── Steps ── */}
            <div className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent mb-4">
              How
            </div>
            <ol className="space-y-3 sm:space-y-4 mb-8">
              {STEPS.map((step, i) => (
                <li key={step.label} className="grid grid-cols-[28px_1fr] gap-3 sm:gap-4">
                  <div className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-600 pt-[3px]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="text-[12px] sm:text-[14px] tracking-[0.12em] uppercase text-white mb-1">
                      {step.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] tracking-[0.08em] text-zinc-400 leading-relaxed font-mono">
                      {step.detail}
                    </div>
                    {step.ctas && step.ctas.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {step.ctas.map((cta) =>
                          cta.onClick ? (
                            <button
                              key={cta.label}
                              type="button"
                              onClick={cta.onClick}
                              className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-gui-accent hover:text-white transition-colors"
                            >
                              {cta.label}
                            </button>
                          ) : (
                            <a
                              key={cta.label}
                              href={cta.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-gui-accent hover:text-white transition-colors"
                            >
                              {cta.label}
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* ── Showcase grid ── */}
            {deployed.length > 0 && (
              <>
                <div className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent mb-4">
                  Fellow forks
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-8">
                  {deployed.map((fork) => (
                    <ForkRow key={fork.repo_url} fork={fork} />
                  ))}
                </ul>
              </>
            )}

            {deployed.length === 0 && stats && (
              <div className="border border-[rgba(var(--gui-accent-rgb),0.25)] bg-[rgba(var(--gui-accent-rgb),0.04)] px-4 py-3 text-[10px] sm:text-[11px] tracking-[0.12em] uppercase text-zinc-300 mb-8">
                <span className="text-gui-accent">Be the first to fork →</span>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="pt-4 border-t border-white/5 text-[9px] tracking-[0.22em] uppercase text-zinc-600 flex flex-wrap gap-x-4 gap-y-1 items-baseline justify-between">
              <a
                href={templateConfig.site.templateRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-gui-accent transition-colors"
              >
                Source on GitHub
              </a>
              <span>
                deep-link: <span className="text-zinc-400">#replicate · #fork · #clone</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* Nested overlay — opens above ReplicateSheet (z-90 > z-80) when the
          user clicks the "AI prompt" CTA. */}
      <AIPromptSheet active={aiPromptOpen} onClose={() => setAiPromptOpen(false)} />
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <span>
      <span className="text-white tabular-nums">{value ?? '—'}</span>{' '}
      {label}
    </span>
  );
}

function ForkRow({ fork }: { fork: ShowcaseEntry }) {
  return (
    <li className="flex items-center gap-3 border border-white/5 px-3 py-2 sm:px-4 sm:py-3 hover:border-[rgba(var(--gui-accent-rgb),0.35)] transition-colors">
      <img
        src={fork.avatar}
        alt=""
        loading="lazy"
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <a
          href={fork.repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] sm:text-[13px] tracking-[0.08em] uppercase text-white hover:text-gui-accent transition-colors truncate"
        >
          {fork.owner}
        </a>
        <div className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-zinc-500 truncate">
          {fork.stars > 0 && (
            <span className="text-gui-accent mr-2">★ {fork.stars}</span>
          )}
          {fork.repo}
        </div>
      </div>
      <a
        href={fork.site_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-400 hover:text-gui-accent transition-colors whitespace-nowrap"
      >
        Live →
      </a>
    </li>
  );
}
