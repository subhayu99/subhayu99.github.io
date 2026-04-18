import { useEffect, useState } from 'react';

interface TriggerHintsProps {
  /** Called when the mobile "lost?" line is tapped. */
  onRequestHelp: () => void;
}

const DESKTOP_HINTS = [
  'a single letter paints the world',
  'spell what slithers (5 keys)',
  'six letters, quick as thought',
  'five letters, then the highway opens',
];

const MOBILE_HINTS = [
  'a good tremor turns the palette',
  'flip me, creature wakes',
  'tap the name, thrice, fast',
  'hold the years, drive them gone',
];

/**
 * TriggerHints — quiet, monospace clue block scattered at the bottom of the
 * portfolio. Each line cryptically encodes one hidden trigger. The last line
 * points to the "help" safety-net for people who can't crack the clues.
 *
 * Auto-detects touch layout and swaps hint copy accordingly — mobile users
 * see gesture clues, desktop users see keyword clues. Never both.
 */
export default function TriggerHints({ onRequestHelp }: TriggerHintsProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const touch =
        'ontouchstart' in window ||
        (navigator.maxTouchPoints || 0) > 0 ||
        window.innerWidth < 900;
      setIsTouch(touch);
    };
    refresh();
    window.addEventListener('resize', refresh);
    return () => window.removeEventListener('resize', refresh);
  }, []);

  const clues = isTouch ? MOBILE_HINTS : DESKTOP_HINTS;
  const lostHint = isTouch ? 'tap here if lost' : 'type "help" if lost';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 font-mono select-none">
      <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 leading-[2]">
        <div className="mb-1">// try me</div>
        {clues.map((clue, i) => (
          <div key={i} className="text-zinc-500">
            // ↳ {clue}
          </div>
        ))}
        <button
          type="button"
          onClick={onRequestHelp}
          className="block w-full text-left text-zinc-500 hover:text-gui-accent transition-colors mt-1 cursor-pointer"
          style={isTouch ? { textDecoration: 'underline', textUnderlineOffset: 3 } : undefined}
        >
          // ↳ {lostHint}
        </button>
      </div>
    </div>
  );
}
