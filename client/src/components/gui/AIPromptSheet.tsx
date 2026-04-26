import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiConfig } from '../../config';

interface AIPromptSheetProps {
  active: boolean;
  onClose: () => void;
}

const HOW_STEPS = [
  'copy the prompt below',
  'open ChatGPT / Claude / Gemini',
  'paste · attach your existing resume (pdf / text / linkedin)',
  'save the yaml output as resume.yaml',
];

/**
 * AIPromptSheet — nested overlay shown from inside ReplicateSheet when the
 * user clicks "AI prompt". Mirrors the TUI AIPromptModal but in editorial
 * style: wide letter-spacing on labels, mono everywhere, accent-on-hover.
 *
 * Layered on top of ReplicateSheet (z-90 vs z-80). The parent suspends its
 * own ESC listener while this overlay is open so ESC closes only the
 * top-most sheet — press ESC twice to drop all the way out.
 */
export default function AIPromptSheet({ active, onClose }: AIPromptSheetProps) {
  const [promptText, setPromptText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lazy-load the prompt the first time the sheet opens
  useEffect(() => {
    if (!active || promptText || loadError) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${apiConfig.basePath}/ai-resume-prompt.txt`);
        if (!response.ok) throw new Error('Failed to fetch prompt');
        const text = await response.text();
        // Dev-server fallback returns index.html when the file is missing —
        // guard so we don't present that to the user as a "prompt".
        if (text.trimStart().startsWith('<!DOCTYPE')) {
          throw new Error('prompt file not found — run npm run build first');
        }
        if (!cancelled) setPromptText(text);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, promptText, loadError]);

  // ESC closes the top-most sheet
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // capture phase so we win against the underlying ReplicateSheet's
    // bubble-phase listener even if both end up bound (defensive).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, onClose]);

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
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
          style={{
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-3xl w-full my-auto border border-[rgba(var(--gui-accent-rgb),0.35)] bg-black p-6 sm:p-8 font-mono text-gui-text flex flex-col max-h-[90vh]"
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

            {/* Header */}
            <div className="flex items-baseline gap-3 mb-1 shrink-0">
              <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent">
                AI Prompt
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <h2 className="font-display text-white leading-[0.9] tracking-tight text-3xl sm:text-5xl mb-2 shrink-0">
              Convert any resume
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5 max-w-xl shrink-0">
              copy the prompt below, paste into your AI of choice with your
              existing resume — get back valid{' '}
              <span className="text-white">resume.yaml</span> in seconds.
            </p>

            {/* How to use */}
            <div className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent mb-3 shrink-0">
              How
            </div>
            <ol className="space-y-1.5 mb-5 shrink-0">
              {HOW_STEPS.map((step, i) => (
                <li
                  key={step}
                  className="grid grid-cols-[24px_1fr] gap-2 sm:gap-3"
                >
                  <span className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-600 pt-[3px]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] sm:text-[13px] tracking-[0.04em] text-zinc-300 leading-relaxed">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {/* Prompt body */}
            <div className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gui-accent mb-2 shrink-0">
              Prompt
            </div>
            <div className="border border-white/5 bg-zinc-950/60 p-3 sm:p-4 overflow-auto flex-1 min-h-[140px] mb-4">
              {loadError ? (
                <div className="text-[11px] sm:text-[12px] text-red-400">
                  {loadError}
                </div>
              ) : promptText ? (
                <pre className="text-[10px] sm:text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono">
                  {promptText}
                </pre>
              ) : (
                <div className="text-[11px] text-zinc-500">loading prompt…</div>
              )}
            </div>

            {/* Footer — size + copy */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <span className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-600 tabular-nums">
                {promptText ? `size · ${(promptText.length / 1024).toFixed(1)} kb` : ' '}
              </span>
              <button
                type="button"
                onClick={copyPrompt}
                disabled={!promptText}
                className={`px-4 py-2 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  copied
                    ? 'border border-gui-accent text-gui-accent bg-[rgba(var(--gui-accent-rgb),0.12)]'
                    : 'border border-[rgba(var(--gui-accent-rgb),0.5)] text-gui-accent hover:bg-[rgba(var(--gui-accent-rgb),0.1)]'
                }`}
              >
                {copied ? '✓ copied' : 'copy prompt'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
