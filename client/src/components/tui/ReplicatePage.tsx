import { useEffect, useRef, useState } from 'react';
import { apiConfig } from '../../config';
import { templateConfig } from '../../generated/template-config';
import { Block } from './Block';
import { NumberedLink } from './NumberedLink';

const { site, docs } = templateConfig;

export function ReplicatePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Block title="// replicate" wide>
        {/* Pitch — sets the payoff + time before any steps. Two ETAs
            because "have a resume?" vs "starting fresh?" diverge here. */}
        <div className="text-white/80 text-xs sm:text-sm mb-1">
          fork this portfolio. drop in a{' '}
          <Code>resume.yaml</Code>, deploy.
        </div>
        <div className="text-tui-muted text-xs mb-3">
          ~5 min if you have a resume · ~10 min from scratch
        </div>

        {/* Inline stats line — quiet, fades in once data loads. Renders
            nothing if the stats file is missing (early dev / pre-fetch). */}
        <StatsLine />

        {/* ── Step 1 ── */}
        <PhaseHeader n={1} title="get your resume.yaml" eta="~2 min" />
        <PhaseBody>
          {/* Dominant CTA — most visitors arrive with a resume in some
              form. The button doesn't convert anything itself — it
              hands you the prompt to feed your AI of choice. The
              label spells that out so users don't expect in-page
              magic. */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group w-full sm:w-auto inline-flex items-center gap-3 border-2 border-terminal-bright-green bg-terminal-bright-green/15 hover:bg-terminal-bright-green/25 px-4 py-2.5 text-terminal-bright-green transition-colors font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-bright-green shadow-[0_0_14px_rgba(var(--glow-color-rgb),0.35)]"
          >
            <span className="text-base font-bold tracking-wide">
              [&nbsp;get ai prompt&nbsp;]
            </span>
            <span className="text-xs text-terminal-bright-green/80">
              copy → paste into chatgpt / claude / gemini
            </span>
            <span
              aria-hidden="true"
              className="ml-auto text-base text-terminal-bright-green transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>

          <ul className="mt-3 space-y-1 text-xs sm:text-sm text-white/80 list-none">
            <AltRow>
              <NumberedLink href={docs.renderCv}>rendercv builder</NumberedLink>
              <span className="text-tui-muted"> — start from scratch in your browser</span>
            </AltRow>
            <AltRow>
              <span className="text-terminal-bright-green">write yaml manually</span>
              <span className="text-tui-muted"> — see schema in </span>
              <NumberedLink href={docs.advanced}>ADVANCED.md</NumberedLink>
            </AltRow>
          </ul>
        </PhaseBody>

        {/* ── Step 2 ── */}
        <PhaseHeader n={2} title="fork &amp; deploy" eta="~3 min" />
        <PhaseBody>
          {/* Default path: GitHub fork (not template) — gives forkers an
              upstream remote so future engine updates are a `git merge`
              away. Advanced (clone + npm) tucked in <details> below. */}
          <Steps>
            <Step n={1}>
              click{' '}
              <NumberedLink href={site.templateForkUrl}>
                "fork this repo"
              </NumberedLink>
              {' '}→ rename it to{' '}
              <Code>&lt;your-username&gt;.github.io</Code>
              {' '}in the "Repository name" field
              <div className="text-tui-muted text-[11px] mt-1">
                replace <Code>&lt;your-username&gt;</Code> with your actual github handle.
                github checks availability inline — leave "copy the main branch only" checked.
              </div>
            </Step>
            <Step n={2}>
              <Callout>
                <div className="font-semibold text-tui-warn">
                  ⚠ enable actions + pages BEFORE uploading your resume
                </div>
                <div className="text-white/80 mt-1">
                  settings → actions → general → allow all
                  <br />
                  settings → pages → source: deploy from actions
                </div>
                <div className="text-tui-muted text-[11px] mt-1">
                  skip this and the first build errors out — common gotcha.
                </div>
              </Callout>
            </Step>
            <Step n={3}>
              upload{' '}
              <Code>resume.yaml</Code>
              {' '}to the repo — the deploy action fires automatically.
            </Step>
          </Steps>

          {/* Advanced — collapsed by default. Native <details> for zero
              JS, accessible by default, keyboard-friendly. */}
          <details className="group mt-4 border-t border-tui-accent-dim/30 pt-3">
            <summary className="cursor-pointer text-xs sm:text-sm text-tui-accent-dim hover:text-terminal-bright-green flex items-center gap-2 list-none focus-visible:outline-none focus-visible:text-terminal-bright-green">
              <span className="font-mono text-terminal-bright-green w-3">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
              <span>advanced (full control — clone + npm)</span>
            </summary>
            <div className="mt-3 pl-5">
              <Steps>
                <Step n={1}>
                  fork on github first (step 1 above), then clone <em>your fork</em> locally:
                  <Pre>
{`git clone https://github.com/<your-username>/<your-username>.github.io.git
cd <your-username>.github.io
npm install`}
                  </Pre>
                </Step>
                <Step n={2}>
                  copy configs:
                  <Pre>
{`cp template.config.yaml.example template.config.yaml
cp .env.example .env
cp client/public/manifest.json.example client/public/manifest.json`}
                  </Pre>
                </Step>
                <Step n={3}>add your resume + customise themes / commands</Step>
                <Step n={4}>push to your fork — github actions deploys automatically</Step>
              </Steps>
            </div>
          </details>
        </PhaseBody>

        {/* ── What you get ── (named phase, no number — it's the payoff
             not a step). Lands before docs so the user sees the reward
             before scrolling into reference links. */}
        <PhaseHeader title="what you get" />
        <PhaseBody>
          <div className="text-xs sm:text-sm text-white/80 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            <Bullet>live at <Code>&lt;your-username&gt;.github.io</Code></Bullet>
            <Bullet>pwa-installable (offline-ready)</Bullet>
            <Bullet>auto-rendered pdf resume</Bullet>
            <Bullet>ascii name banner</Bullet>
            <Bullet>neofetch system info</Bullet>
            <Bullet>themes + custom commands</Bullet>
          </div>
        </PhaseBody>

        {/* ── Keep up to date ── (forker upgrade flow). Forks get an
             upstream remote for free; merging future engine work is one
             command. UPGRADING.md spells out conflict-recovery. */}
        <PhaseHeader title="keep up to date" />
        <PhaseBody>
          <div className="text-xs sm:text-sm text-white/80 mb-2">
            forks have an <Code>upstream</Code> remote pointing at this template by default —
            pull future engine improvements without losing your <Code>resume.yaml</Code>:
          </div>
          <Pre>
{`git fetch upstream main
git merge upstream/main
git push origin main`}
          </Pre>
          <div className="text-tui-muted text-[11px] mt-2">
            full guide (auto-PR workflow, conflict recovery, orphan migration):{' '}
            <NumberedLink href={docs.upgrading}>UPGRADING.md</NumberedLink>
          </div>
        </PhaseBody>

        {/* ── Help / docs ── */}
        <div className="mt-2 pt-3 border-t border-tui-accent-dim/30">
          <div className="text-tui-accent-dim text-xs mb-2">// docs</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <NumberedLink href={docs.easyMode}>easy mode guide</NumberedLink>
            <NumberedLink href={docs.advanced}>advanced customisation</NumberedLink>
            <NumberedLink href={docs.renderCv}>rendercv builder</NumberedLink>
            <NumberedLink href={docs.troubleshooting}>troubleshooting</NumberedLink>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-tui-accent-dim/30 text-center text-xs text-tui-muted">
          built with love and a little obsession ·{' '}
          <NumberedLink href={site.templateRepoUrl}>star on github</NumberedLink>
        </div>
      </Block>
      {modalOpen && <AIPromptModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ── Small primitives used only by this page ──

/** Numbered phase header — `// step N — title` with optional ETA on the right. */
function PhaseHeader({
  n,
  title,
  eta,
}: {
  n?: number;
  title: string;
  eta?: string;
}) {
  return (
    <div className="mt-5 mb-2 flex items-baseline justify-between gap-2">
      <div className="text-terminal-bright-green text-xs sm:text-sm font-mono tracking-wide">
        // {n != null ? `step ${n} — ` : ''}{title}
      </div>
      {eta && (
        <div className="text-tui-muted text-[10px] sm:text-xs tabular-nums whitespace-nowrap">
          {eta}
        </div>
      )}
    </div>
  );
}

/** Body of a phase — left rail + indent so phases visually group. */
function PhaseBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="pl-3 border-l-2 border-tui-accent-dim/30">{children}</div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-2 list-none">{children}</ol>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-terminal-bright-green tabular-nums font-mono text-xs sm:text-sm">
        {n}.
      </span>
      <div className="text-white/90 flex-1 leading-relaxed text-xs sm:text-sm">
        {children}
      </div>
    </li>
  );
}

function AltRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-tui-accent-dim mt-[2px]">·</span>
      <div className="flex-1">{children}</div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-terminal-bright-green mt-[1px]">·</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Boxed warning — louder than a one-line tip, scoped to a step. */
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-tui-warn/40 bg-tui-warn/[0.04] px-3 py-2 text-xs sm:text-sm">
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-terminal-bright-green bg-terminal-bright-green/10 px-1 py-0.5 text-xs border border-tui-accent-dim/30">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="border-l-2 border-tui-accent-dim/50 mt-1.5 pl-3 font-mono text-[11px] sm:text-xs text-terminal-green whitespace-pre-wrap">
      {children}
    </pre>
  );
}

// ── Inline live stats — quiet headline, links to full `showcase` ──

interface MiniStats {
  stars: number;
  forks: number;
  deployed_forks: number;
}

function StatsLine() {
  const [stats, setStats] = useState<MiniStats | null>(null);

  useEffect(() => {
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
        /* silently skip — stats are nice-to-have, not blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;
  const headline = stats.deployed_forks > 0 ? stats.deployed_forks : stats.forks;
  if (headline === 0 && stats.stars === 0) return null;

  return (
    <div className="text-tui-muted text-[11px] sm:text-xs mb-5 flex flex-wrap items-baseline gap-x-3">
      <span>
        <span className="text-terminal-bright-green tabular-nums">{stats.stars}</span> stars
      </span>
      <span>·</span>
      <span>
        <span className="text-terminal-bright-green tabular-nums">{headline}</span>{' '}
        {headline === stats.deployed_forks ? 'deployed forks' : 'forks'}
      </span>
      <span>·</span>
      <span className="text-tui-muted">
        type <code className="text-terminal-bright-green">showcase</code> for the full list
      </span>
    </div>
  );
}

// ── AI prompt modal ──

function AIPromptModal({ onClose }: { onClose: () => void }) {
  const [promptText, setPromptText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${apiConfig.basePath}/ai-resume-prompt.txt`);
        if (!response.ok) throw new Error('Failed to fetch prompt');
        const text = await response.text();
        // Dev-server fallback for missing static assets returns index.html —
        // guard so we don't present that to the user as a "prompt".
        if (text.trimStart().startsWith('<!DOCTYPE')) {
          throw new Error('Prompt file not found');
        }
        if (!cancelled) setPromptText(text);
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load AI prompt:', e);
          setLoadError('Failed to load the AI conversion prompt. Please try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const copyPrompt = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Resume Conversion Prompt"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-terminal-black border border-tui-accent-dim/50 border-l-[3px] border-l-terminal-bright-green max-w-4xl w-full max-h-[85vh] flex flex-col outline-none terminal-glow"
      >
        {/* Punched-through title — matches Block chrome */}
        <div className="absolute -top-2.5 left-3 right-3 flex items-center justify-between font-mono text-xs pointer-events-none">
          <span className="bg-terminal-black px-2 text-terminal-bright-green pointer-events-auto">
            // ai-resume-prompt
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-terminal-black px-2 text-tui-muted hover:text-terminal-bright-green pointer-events-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green"
          >
            [esc]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-5 space-y-3">
          <div className="text-white/80 text-xs space-y-2">
            <div className="text-tui-accent-dim">how to use:</div>
            <ol className="list-decimal list-inside space-y-0.5 ml-2 text-xs">
              <li>copy the prompt below</li>
              <li>open ChatGPT / Claude / Gemini</li>
              <li>paste the prompt</li>
              <li>attach your existing resume (pdf, text, linkedin)</li>
              <li>
                ai generates yaml — save as{' '}
                <code className="text-terminal-bright-green">resume.yaml</code>
              </li>
            </ol>
          </div>

          <div className="border border-tui-accent-dim/30 bg-terminal-black p-3 overflow-x-auto">
            {loadError ? (
              <div className="text-tui-error text-xs">{loadError}</div>
            ) : promptText ? (
              <pre className="text-terminal-green text-[11px] sm:text-xs leading-relaxed font-mono whitespace-pre-wrap">
                {promptText}
              </pre>
            ) : (
              <div className="text-tui-muted text-xs">loading prompt…</div>
            )}
          </div>
        </div>

        <div className="border-t border-tui-accent-dim/30 px-4 py-2 flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="text-[10px] text-tui-muted tabular-nums">
            {promptText ? `size: ${(promptText.length / 1024).toFixed(1)} kb` : ' '}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              disabled={!promptText}
              className={`border px-3 py-1 text-xs font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green ${
                copied
                  ? 'border-terminal-bright-green text-terminal-bright-green bg-terminal-bright-green/10'
                  : 'border-terminal-bright-green/50 text-terminal-bright-green hover:bg-terminal-bright-green/10'
              }`}
            >
              {copied ? '✓ copied' : 'copy prompt'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-tui-muted/50 px-3 py-1 text-xs text-tui-muted font-mono hover:text-tui-error hover:border-tui-error/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tui-error"
            >
              close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
