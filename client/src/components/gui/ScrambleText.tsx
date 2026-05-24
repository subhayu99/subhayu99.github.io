import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';

const GLYPHS = '@#%¥∆§£€¢¤░▒▓█▀▄■□◆◇○●アイ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ'.split(' ');
const CYCLES = 3;
const TICK_MS = 28;

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function ScrambleText({ text, className = '', delay = 0 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { margin: '-60px' });
  const [display, setDisplay] = useState(text);
  const hasPlayed = useRef(false);
  const isHovering = useRef(false);
  const activeInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearActive = useCallback(() => {
    if (activeInterval.current) { clearInterval(activeInterval.current); activeInterval.current = null; }
    if (activeTimeout.current) { clearTimeout(activeTimeout.current); activeTimeout.current = null; }
  }, []);

  const scramble = useCallback((targetText: string, startDelay: number) => {
    clearActive();

    const chars = targetText.split('');
    const resolved = new Array(chars.length).fill(false);
    const current = chars.map((ch) => (ch === ' ' ? ' ' : randomGlyph()));

    activeTimeout.current = setTimeout(() => {
      activeTimeout.current = null;
      setDisplay(current.join(''));

      let charIndex = 0;
      let cycleCount = 0;

      activeInterval.current = setInterval(() => {
        for (let i = charIndex; i < chars.length; i++) {
          if (!resolved[i] && chars[i] !== ' ') {
            current[i] = randomGlyph();
          }
        }

        cycleCount++;
        if (cycleCount >= CYCLES) {
          resolved[charIndex] = true;
          current[charIndex] = chars[charIndex];
          charIndex++;
          cycleCount = 0;

          while (charIndex < chars.length && chars[charIndex] === ' ') {
            resolved[charIndex] = true;
            current[charIndex] = ' ';
            charIndex++;
          }
        }

        setDisplay(current.join(''));

        if (charIndex >= chars.length) {
          clearActive();
          setDisplay(targetText);
        }
      }, TICK_MS);
    }, startDelay);

    return () => {
      clearActive();
      setDisplay(targetText);
    };
  }, [clearActive]);

  useEffect(() => {
    if (isInView && !hasPlayed.current) {
      hasPlayed.current = true;
      const cleanup = scramble(text, delay);
      return cleanup;
    }
  }, [isInView, text, delay, scramble]);

  const handleMouseEnter = useCallback(() => {
    if (isHovering.current) return;
    isHovering.current = true;
    clearActive();

    const chars = text.split('');
    const current = text.split('');
    const mid = Math.floor(chars.length / 2);

    const distances = chars.map((_, i) => Math.abs(i - mid));
    const maxDist = Math.max(...distances);
    const resolved = new Array(chars.length).fill(false);

    chars.forEach((ch, i) => { if (ch === ' ') resolved[i] = true; });

    let tick = 0;
    const totalTicks = (maxDist + 1) * CYCLES + CYCLES;

    activeInterval.current = setInterval(() => {
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
        clearActive();
        setDisplay(text);
        isHovering.current = false;
      }
    }, TICK_MS);
  }, [text, clearActive]);

  useEffect(() => {
    return () => clearActive();
  }, [clearActive]);

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
