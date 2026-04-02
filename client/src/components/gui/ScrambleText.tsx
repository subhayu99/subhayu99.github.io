import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';

const GLYPHS = '@#%¥∆§£€¢¤░▒▓█▀▄■□◆◇○●アイ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ'.split(' ');
const CYCLES = 5;
const TICK_MS = 28;

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Delay in ms before starting the decode (useful for staggering) */
  delay?: number;
}

export default function ScrambleText({ text, className = '', delay = 0 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { margin: '-60px' });
  const [display, setDisplay] = useState(text);
  const hasPlayed = useRef(false);
  const isHovering = useRef(false);

  const scramble = useCallback((targetText: string, startDelay: number) => {
    let cancelled = false;

    const chars = targetText.split('');
    const resolved = new Array(chars.length).fill(false);
    const current = chars.map((ch) => (ch === ' ' ? ' ' : randomGlyph()));

    // Immediately show scrambled state
    setTimeout(() => {
      if (cancelled) return;
      setDisplay(current.join(''));

      let charIndex = 0;
      let cycleCount = 0;

      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }

        // Cycle random glyphs for unresolved characters
        for (let i = charIndex; i < chars.length; i++) {
          if (!resolved[i] && chars[i] !== ' ') {
            current[i] = randomGlyph();
          }
        }

        cycleCount++;
        if (cycleCount >= CYCLES) {
          // Lock in the next character
          resolved[charIndex] = true;
          current[charIndex] = chars[charIndex];
          charIndex++;
          cycleCount = 0;

          // Skip spaces
          while (charIndex < chars.length && chars[charIndex] === ' ') {
            resolved[charIndex] = true;
            current[charIndex] = ' ';
            charIndex++;
          }
        }

        setDisplay(current.join(''));

        if (charIndex >= chars.length) {
          clearInterval(interval);
          setDisplay(targetText);
        }
      }, TICK_MS);
    }, startDelay);

    return () => { cancelled = true; };
  }, []);

  // Scramble on scroll into view
  useEffect(() => {
    if (isInView && !hasPlayed.current) {
      hasPlayed.current = true;
      const cleanup = scramble(text, delay);
      return cleanup;
    }
  }, [isInView, text, delay, scramble]);

  // Re-scramble on hover (ripple from center outward)
  const handleMouseEnter = useCallback(() => {
    if (isHovering.current) return;
    isHovering.current = true;

    const chars = text.split('');
    const current = text.split('');
    const mid = Math.floor(chars.length / 2);

    // Calculate distance from center for each character
    const distances = chars.map((_, i) => Math.abs(i - mid));
    const maxDist = Math.max(...distances);
    const resolved = new Array(chars.length).fill(false);

    // Mark spaces as already resolved
    chars.forEach((ch, i) => { if (ch === ' ') resolved[i] = true; });

    let tick = 0;
    const totalTicks = (maxDist + 1) * CYCLES + CYCLES;

    const interval = setInterval(() => {
      tick++;

      for (let i = 0; i < chars.length; i++) {
        if (resolved[i]) continue;
        const activationTick = distances[i] * 2;
        if (tick >= activationTick && tick < activationTick + CYCLES * 2) {
          current[i] = randomGlyph();
        } else if (tick >= activationTick + CYCLES * 2) {
          current[i] = chars[i];
          resolved[i] = true;
        }
      }

      setDisplay(current.join(''));

      if (tick >= totalTicks || resolved.every(Boolean)) {
        clearInterval(interval);
        setDisplay(text);
        isHovering.current = false;
      }
    }, TICK_MS);
  }, [text]);

  return (
    <span
      ref={ref}
      className={`inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {display}
    </span>
  );
}
