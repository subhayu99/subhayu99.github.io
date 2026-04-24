import { useEffect, useRef, useState } from 'react';
import { apiConfig } from '../../config';
import { Block } from './Block';
import { NumberedLink } from './NumberedLink';

export function ReplicatePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Block title="// replicate" wide>
        <div className="text-tui-muted text-xs mb-4">
          clone this portfolio — drop in a resume.yaml, deploy. pick a path below.
        </div>

        <Subsection title="// ai converter">
          <p className="text-white/80 mb-2">
            already have a resume? convert it to YAML via AI in ~2 min.
          </p>
          <Steps>
            <Step n={1}>get the ai conversion prompt (button below)</Step>
            <Step n={2}>paste the prompt into ChatGPT / Claude / Gemini</Step>
            <Step n={3}>attach or paste your existing resume (pdf, text, linkedin)</Step>
            <Step n={4}>
              ai generates yaml — save as{' '}
              <Code>resume.yaml</Code>
            </Step>
          </Steps>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="border border-terminal-bright-green px-3 py-1 text-terminal-bright-green hover:bg-terminal-bright-green/10 transition-colors text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green"
            >
              get conversion prompt
            </button>
            <span className="text-tui-muted text-xs">
              works with any ai assistant
            </span>
          </div>
        </Subsection>

        <Subsection title="// easy mode">
          <p className="text-white/80 mb-2">
            zero-code deploy — everything auto-generates from your resume.yaml.
          </p>
          <Steps>
            <Step n={1}>
              create{' '}
              <Code>resume.yaml</Code>
              {' '}(use{' '}
              <NumberedLink href="https://app.rendercv.com">rendercv</NumberedLink>{' '}
              or ai, above)
            </Step>
            <Step n={2}>
              click{' '}
              <NumberedLink href="https://github.com/subhayu99/subhayu99.github.io/generate">
                "use this template"
              </NumberedLink>
              {' '}→ name it{' '}
              <Code>yourusername.github.io</Code>
            </Step>
            <Step n={3}>
              enable actions + pages:{' '}
              <span className="text-tui-accent-dim">settings → pages → deploy from actions</span>
              <div className="text-tui-warn/80 text-xs mt-1">
                ! do this before uploading resume or the first build errors
              </div>
            </Step>
            <Step n={4}>
              upload{' '}
              <Code>resume.yaml</Code>
              {' '}to the repo — deploy fires automatically.
            </Step>
          </Steps>
          <div className="mt-3 border-l-2 border-tui-accent-dim/50 pl-3 text-xs text-white/80">
            <div className="text-tui-accent-dim mb-1">auto-generated:</div>
            <ul className="space-y-0.5 list-none">
              <li>· ascii art name banner</li>
              <li>· pwa manifest.json</li>
              <li>· pdf resume</li>
              <li>· neofetch banner (if custom not provided)</li>
            </ul>
          </div>
        </Subsection>

        <Subsection title="// advanced mode">
          <p className="text-white/80 mb-2">
            full control over themes, commands, features. npm + git.
          </p>
          <Steps>
            <Step n={1}>
              clone + install:
              <Pre>
{`git clone https://github.com/subhayu99/subhayu99.github.io.git
cd subhayu99.github.io
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
            <Step n={4}>push + enable github pages</Step>
          </Steps>
        </Subsection>

        <div className="mt-4 pt-3 border-t border-tui-accent-dim/30">
          <div className="text-tui-accent-dim text-xs mb-2">// docs</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <NumberedLink href="https://github.com/subhayu99/subhayu99.github.io#readme">
              easy mode guide
            </NumberedLink>
            <NumberedLink href="https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/ADVANCED.md">
              advanced customisation
            </NumberedLink>
            <NumberedLink href="https://app.rendercv.com">
              rendercv builder
            </NumberedLink>
            <NumberedLink href="https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/TROUBLESHOOTING.md">
              troubleshooting
            </NumberedLink>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-tui-accent-dim/30 text-center text-xs text-tui-muted">
          built with love and a little obsession ·{' '}
          <NumberedLink href="https://github.com/subhayu99/subhayu99.github.io">
            star on github
          </NumberedLink>
        </div>
      </Block>
      {modalOpen && <AIPromptModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ── Small primitives used only by this page ──

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-tui-accent-dim text-xs mb-2">{title}</div>
      <div className="pl-2 border-l-2 border-tui-accent-dim/30 text-xs sm:text-sm">
        {children}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-1.5 ml-1 list-none">{children}</ol>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-terminal-bright-green tabular-nums font-mono">
        {n}.
      </span>
      <div className="text-white flex-1 leading-relaxed">{children}</div>
    </li>
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
