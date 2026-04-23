import { useEffect, useRef, useState } from 'react';
import { apiConfig } from '../../config';
import { ExtLink } from './TuiLink';

export function ReplicatePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl">
        <div className="border-b border-terminal-green/30 px-3 py-1 text-center">
          <span className="text-terminal-bright-green text-lg font-bold">
            🎨 CREATE YOUR OWN TERMINAL PORTFOLIO
          </span>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <AiConverterSection onOpenModal={() => setModalOpen(true)} />
          <EasyModeSection />
          <AdvancedModeSection />
          <CTASection />
          <QuickLinks />
          <Footer />
        </div>
      </div>
      {modalOpen && <AIPromptModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

function AiConverterSection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="border border-terminal-bright-green/40 rounded p-3 bg-terminal-bright-green/10">
      <div className="text-terminal-bright-green font-bold text-base mb-2 flex items-center gap-2">
        <span>🔄 AI-POWERED RESUME CONVERTER</span>
        <span className="text-xs bg-terminal-bright-green/30 px-2 py-0.5 rounded">
          ⚡ Fastest method
        </span>
      </div>
      <div className="text-terminal-green mb-3">
        <strong>Already have a resume?</strong> Convert it to YAML format using AI in ~2 minutes. No
        manual typing!
      </div>
      <ol className="space-y-2 ml-3 text-sm">
        <Step n={1} accent="bright-green">
          Click the button below to get the AI conversion prompt
        </Step>
        <Step n={2} accent="bright-green">
          Copy the prompt and paste it into ChatGPT/Claude/Gemini
        </Step>
        <Step n={3} accent="bright-green">
          Attach or paste your existing resume (PDF, text, or LinkedIn)
        </Step>
        <Step n={4} accent="bright-green">
          AI generates perfect YAML — save as{' '}
          <code className="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code>
        </Step>
      </ol>
      <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <button
          type="button"
          onClick={onOpenModal}
          className="bg-terminal-bright-green/20 hover:bg-terminal-bright-green/30 border border-terminal-bright-green/50 px-4 py-2 rounded text-terminal-bright-green font-semibold transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          📋 Get AI Conversion Prompt
        </button>
        <div className="text-xs text-terminal-bright-green/70">
          Works with any AI assistant (ChatGPT, Claude, Gemini)
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-terminal-bright-green/20 text-xs text-terminal-green flex flex-wrap items-center gap-3">
        <span>⚡ ~2 minutes</span>
        <span>🤖 AI-powered</span>
        <span>💯 Perfect formatting</span>
        <span>📝 Supports any resume format</span>
      </div>
    </div>
  );
}

function EasyModeSection() {
  return (
    <div className="border border-terminal-yellow/30 rounded p-3 bg-terminal-yellow/5">
      <div className="text-terminal-yellow font-bold text-base mb-3 flex items-center gap-2">
        <span>🌟 EASY MODE</span>
        <span className="text-xs bg-terminal-yellow/20 px-2 py-0.5 rounded">Zero-code setup</span>
      </div>
      <div className="text-terminal-green mb-3">
        <strong>True zero-code deployment!</strong> Everything auto-generates — just upload your
        resume YAML.
      </div>
      <ol className="space-y-2 ml-3">
        <Step n={1} accent="yellow">
          Create <code className="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code>{' '}
          (use{' '}
          <ExtLink href="https://app.rendercv.com" className="text-terminal-bright-green">
            RenderCV
          </ExtLink>{' '}
          or AI — see above)
        </Step>
        <Step n={2} accent="yellow">
          Click{' '}
          <ExtLink
            href="https://github.com/subhayu99/subhayu99.github.io/generate"
            className="text-terminal-bright-green"
          >
            "Use this template"
          </ExtLink>{' '}
          → Name it{' '}
          <code className="text-terminal-bright-green bg-black/30 px-1">
            yourusername.github.io
          </code>
        </Step>
        <Step n={3} accent="yellow">
          Enable GitHub Actions &amp; Pages:{' '}
          <span className="text-terminal-yellow">Settings → Pages → Deploy from Actions</span>
          <div className="text-terminal-yellow/70 text-xs mt-1">
            ⚠️ Do this BEFORE uploading resume to avoid errors!
          </div>
        </Step>
        <Step n={4} accent="yellow">
          Upload your{' '}
          <code className="text-terminal-bright-green bg-black/30 px-1">resume.yaml</code> to the
          repo — deployment starts automatically!
        </Step>
      </ol>
      <div className="mt-3 p-2 bg-black/30 rounded border border-terminal-green/30">
        <div className="text-terminal-bright-green font-bold text-xs mb-1">
          ✨ Auto-Generated Features:
        </div>
        <div className="text-terminal-green/80 text-xs space-y-0.5 ml-2">
          <div>• ASCII art name banner (from your name)</div>
          <div>• PWA manifest.json (installable app)</div>
          <div>• PDF resume (formatted and downloadable)</div>
          <div>• Neofetch banner (if custom file not provided)</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-terminal-yellow/20 text-xs text-terminal-green flex items-center justify-between gap-3 flex-wrap">
        <span>⏱️ Time: ~5 min</span>
        <span>✨ Auto-Generated</span>
        <span>💰 Free Forever</span>
        <span>💻 Zero Code</span>
      </div>
    </div>
  );
}

function AdvancedModeSection() {
  return (
    <div className="border border-terminal-green/30 rounded p-3 bg-terminal-green/5">
      <div className="text-terminal-bright-green font-bold text-base mb-3">🔧 ADVANCED MODE</div>
      <div className="text-terminal-green mb-3">
        Full control over themes, commands, and features. Requires npm/git knowledge.
      </div>
      <ol className="space-y-2 ml-3">
        <Step n={1} accent="green">
          <div>
            Clone the template and install dependencies:
            <pre className="bg-black/50 rounded p-2 mt-1 font-mono text-xs text-terminal-green whitespace-pre-wrap">
{`git clone https://github.com/subhayu99/subhayu99.github.io.git
cd subhayu99.github.io
npm install`}
            </pre>
          </div>
        </Step>
        <Step n={2} accent="green">
          <div>
            Copy and customize config files:
            <pre className="bg-black/50 rounded p-2 mt-1 font-mono text-xs text-terminal-green whitespace-pre-wrap">
{`cp template.config.yaml.example template.config.yaml
cp .env.example .env
cp client/public/manifest.json.example client/public/manifest.json`}
            </pre>
          </div>
        </Step>
        <Step n={3} accent="green">
          Add your resume and customize themes/commands
          <div className="text-terminal-green/70 text-xs mt-1">
            ✓ See ADVANCED.md for customization guide
          </div>
        </Step>
        <Step n={4} accent="green">
          Deploy to GitHub Pages
          <div className="text-terminal-green/70 text-xs mt-1">
            ✓ Push to GitHub and enable Actions
          </div>
        </Step>
      </ol>
    </div>
  );
}

function CTASection() {
  return (
    <div className="border border-terminal-bright-green/40 rounded p-3 bg-terminal-green/5 text-center">
      <div className="text-terminal-bright-green font-bold text-base mb-2">
        🚀 Ready to Create Your Portfolio?
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="https://github.com/subhayu99/subhayu99.github.io/generate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-terminal-green/20 hover:bg-terminal-green/30 border border-terminal-green text-terminal-bright-green font-bold px-4 py-2 rounded transition-all duration-200 hover:scale-105"
        >
          ⚡ Get Started Now
        </a>
        <span className="text-terminal-green/70 text-xs">
          ~5 minutes • Zero coding required
        </span>
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
    { href: 'https://github.com/subhayu99/subhayu99.github.io#readme', text: '📖 Easy Mode Guide' },
    {
      href: 'https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/ADVANCED.md',
      text: '🔧 Advanced Customization',
    },
    { href: 'https://app.rendercv.com', text: '🎨 RenderCV Builder' },
    {
      href: 'https://github.com/subhayu99/subhayu99.github.io/blob/main/docs/TROUBLESHOOTING.md',
      text: '🛟 Troubleshooting',
    },
  ];
  return (
    <div className="border-t border-terminal-green/30 pt-3 mt-3">
      <div className="text-terminal-bright-green font-bold mb-2">📚 Documentation &amp; Help</div>
      <div className="grid grid-cols-2 gap-2 text-xs ml-3">
        {links.map((l) => (
          <div key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-terminal-yellow hover:text-terminal-yellow hover:underline transition-colors duration-200"
            >
              {l.text}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center text-xs text-terminal-green/70 border-t border-terminal-green/20 pt-3 space-y-1">
      <div>⚡ Built with ❤️ by developers, for developers</div>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <a
          href="https://github.com/subhayu99/subhayu99.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-terminal-yellow hover:text-terminal-yellow hover:underline transition-colors duration-200"
        >
          ⭐ Star on GitHub
        </a>
        <span>•</span>
        <span>🤖 AI-Assisted Setup</span>
        <span>•</span>
        <span>✨ Auto-Generated</span>
      </div>
    </div>
  );
}

function Step({
  n,
  accent,
  children,
}: {
  n: number;
  accent: 'bright-green' | 'yellow' | 'green';
  children: React.ReactNode;
}) {
  const colorMap: Record<typeof accent, string> = {
    'bright-green': 'text-terminal-bright-green',
    yellow: 'text-terminal-yellow',
    green: 'text-terminal-green',
  };
  return (
    <li className="flex items-start gap-2 list-none">
      <span className={`${colorMap[accent]} font-bold`}>{n}.</span>
      <div className="text-white flex-1">{children}</div>
    </li>
  );
}

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-terminal-black border-2 border-terminal-bright-green rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl outline-none"
      >
        <div className="border-b border-terminal-bright-green/50 px-4 py-3 flex items-center justify-between bg-terminal-bright-green/10">
          <div className="flex items-center gap-3">
            <span className="text-terminal-bright-green font-bold text-lg">
              🤖 AI Resume Conversion Prompt
            </span>
            <span className="text-xs bg-terminal-bright-green/30 px-2 py-1 rounded text-terminal-bright-green">
              Ready to Copy
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-terminal-bright-green hover:text-terminal-bright-green text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-terminal-bright-green/20 rounded transition-all"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-terminal-green text-sm space-y-2">
            <p>
              <strong>How to use this prompt:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Copy the prompt below using the button</li>
              <li>Open ChatGPT, Claude, or Gemini</li>
              <li>Paste the prompt</li>
              <li>Attach or paste your existing resume (PDF, text, LinkedIn profile, etc.)</li>
              <li>
                AI will generate perfect YAML — save it as{' '}
                <code className="bg-black/50 px-1 rounded text-terminal-bright-green">
                  resume.yaml
                </code>
              </li>
            </ol>
          </div>

          <div className="bg-black/50 rounded border border-terminal-bright-green/30 p-4 overflow-x-auto">
            {loadError ? (
              <div className="text-terminal-red text-sm">{loadError}</div>
            ) : promptText ? (
              <pre className="text-terminal-green text-xs leading-relaxed font-mono whitespace-pre-wrap">
                {promptText}
              </pre>
            ) : (
              <div className="text-terminal-green/70 text-sm">Loading prompt…</div>
            )}
          </div>
        </div>

        <div className="border-t border-terminal-bright-green/50 px-4 py-3 bg-terminal-bright-green/5 flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="text-xs text-terminal-bright-green/70">
            {promptText ? `Prompt size: ${(promptText.length / 1024).toFixed(1)} KB` : ' '}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              disabled={!promptText}
              className={`border px-4 py-2 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                copied
                  ? 'bg-terminal-green/30 border-terminal-green/50 text-terminal-bright-green'
                  : 'bg-terminal-bright-green/20 hover:bg-terminal-bright-green/30 border-terminal-bright-green/50 text-terminal-bright-green'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy Prompt'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-terminal-red/20 hover:bg-terminal-red/30 border border-terminal-red/50 px-4 py-2 rounded text-terminal-red font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
