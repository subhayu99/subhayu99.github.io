import { useEffect, useState } from 'react';
import { apiConfig } from '../../config';
import { templateConfig } from '../../generated/template-config';
import { Block } from './Block';
import { NumberedLink } from './NumberedLink';

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
  repo: string;
  repo_url: string;
  is_template: boolean;
  since: string;
  stars: number;
  forks: number;
  network: number;
  watchers: number;
  deployed_forks: number;
  orphan_derivatives: number | null;
  traffic: {
    clones_14d: number;
    unique_cloners_14d: number;
    views_14d: number;
    unique_viewers_14d: number;
  } | null;
  showcase: ShowcaseEntry[];
  last_updated: string;
}

export function StatsPage() {
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiConfig.basePath}/template-stats.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // Dev-server fallback returns index.html when the file is missing —
        // guard so we don't try to parse the SPA shell as JSON.
        if (text.trimStart().startsWith('<!DOCTYPE')) {
          throw new Error("stats file not found — run `node scripts/fetch-stats.js`");
        }
        if (!cancelled) setStats(JSON.parse(text));
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Block title="// showcase" wide>
      {error ? (
        <ErrorState error={error} />
      ) : !stats ? (
        <LoadingState />
      ) : (
        <Populated stats={stats} />
      )}
    </Block>
  );
}

function LoadingState() {
  return <div className="text-tui-muted text-xs sm:text-sm">loading stats…</div>;
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="text-xs sm:text-sm">
      <div className="text-tui-error mb-1">stats unavailable</div>
      <div className="text-tui-muted">{error}</div>
    </div>
  );
}

function Populated({ stats }: { stats: TemplateStats }) {
  // Headline = real forks + orphan-detected derivatives. Until the fork
  // flow has accumulated, orphans (pre-fork-flow "Use this template"
  // clones) are the dominant signal. Both are disjoint sets — fetchOrphans
  // already filters out repos already counted as forks.
  const orphans = stats.orphan_derivatives ?? 0;
  const headlineCount = stats.forks + orphans;
  const sinceYear = stats.since ? new Date(stats.since).getFullYear() : null;
  const updated = formatRelative(stats.last_updated);
  const deployedShowcase = stats.showcase.filter((f) => f.has_pages);
  const undeployedCount = stats.showcase.length - deployedShowcase.length;

  return (
    <>
      {/* Hero — the headline number leads, the rest is supporting context. */}
      <div className="mb-1">
        <div className="text-terminal-bright-green text-2xl sm:text-3xl font-semibold tabular-nums">
          {headlineCount > 0 ? `${headlineCount}+` : '0'}
        </div>
        <div className="text-white/80 text-xs sm:text-sm">
          {headlineCount > 0
            ? 'developers building portfolios with this template'
            : 'no forks yet — be the first'}
        </div>
      </div>

      {/* Aggregate stats line */}
      <div className="text-tui-muted text-[11px] sm:text-xs flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-4 mt-2">
        <Stat icon="⭐" value={stats.stars} label="stars" />
        <Stat icon="🍴" value={stats.forks} label="forks" />
        <Stat icon="🌐" value={stats.deployed_forks} label="deployed" />
        {orphans > 0 && (
          <Stat icon="🔍" value={orphans} label="detected" />
        )}
        {stats.traffic && (
          <Stat
            icon="📥"
            value={stats.traffic.unique_cloners_14d}
            label="unique cloners (14d)"
          />
        )}
        {sinceYear && <span className="text-tui-muted">since {sinceYear}</span>}
      </div>

      {/* Showcase grid — deployed forks first, with avatar, handle, stars, links. */}
      {deployedShowcase.length > 0 && (
        <>
          <SectionHeader>// fellow forks</SectionHeader>
          <ul className="space-y-1.5 mb-4">
            {deployedShowcase.map((fork) => (
              <ShowcaseRow key={fork.repo_url} fork={fork} />
            ))}
          </ul>
        </>
      )}

      {/* Forks that exist but haven't enabled GitHub Pages yet. */}
      {undeployedCount > 0 && (
        <div className="text-tui-muted text-[11px] mt-2">
          + {undeployedCount} fork{undeployedCount > 1 ? 's' : ''} not yet deployed
        </div>
      )}

      {/* Orphan derivatives footnote — only when we have forks to compare
          against; otherwise the headline already conveys the count. */}
      {orphans > 0 && stats.forks > 0 ? (
        <div className="text-tui-muted text-[11px] mt-1">
          + {orphans} unlinked deployment{orphans > 1 ? 's' : ''} detected via code search
        </div>
      ) : null}

      {/* Empty state CTA — only when there's truly no signal at all */}
      {stats.showcase.length === 0 && orphans === 0 && (
        <div className="border border-tui-accent-dim/30 bg-terminal-bright-green/5 px-3 py-3 text-xs sm:text-sm text-white/80 mt-3">
          <div className="text-terminal-bright-green font-semibold mb-1">
            be the first to fork
          </div>
          <div className="text-tui-muted">
            type{' '}
            <code className="text-terminal-bright-green">replicate</code>
            {' '}for the full guide.
          </div>
        </div>
      )}

      {/* Footer — refresh time + canonical link to the upstream repo */}
      <div className="mt-4 pt-3 border-t border-tui-accent-dim/30 flex items-center justify-between text-[10px] sm:text-[11px] text-tui-muted">
        <NumberedLink href={templateConfig.site.templateRepoUrl}>
          {stats.repo}
        </NumberedLink>
        <span>updated {updated}</span>
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="mr-1">{icon}</span>
      <span className="text-terminal-bright-green tabular-nums">{value}</span>
      <span className="text-tui-muted ml-1">{label}</span>
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-terminal-bright-green text-xs sm:text-sm font-mono tracking-wide mt-3 mb-2">
      {children}
    </div>
  );
}

function ShowcaseRow({ fork }: { fork: ShowcaseEntry }) {
  const pushedRel = formatRelative(fork.pushed_at);
  return (
    <li className="flex items-center gap-3 text-xs sm:text-sm">
      <img
        src={fork.avatar}
        alt=""
        loading="lazy"
        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-tui-accent-dim/40 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <NumberedLink href={fork.repo_url}>{fork.owner}</NumberedLink>
          <span className="text-tui-muted text-[11px] truncate">{fork.repo}</span>
        </div>
        <div className="text-tui-muted text-[10px] sm:text-[11px]">
          updated {pushedRel}
          {fork.stars > 0 && (
            <>
              {' · '}⭐{fork.stars}
            </>
          )}
        </div>
      </div>
      <NumberedLink
        href={fork.site_url}
        className="text-[11px] whitespace-nowrap"
      >
        live →
      </NumberedLink>
    </li>
  );
}

function formatRelative(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
