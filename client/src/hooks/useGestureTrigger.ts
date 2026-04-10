import { useEffect, useRef, useCallback, useState } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const SNAKE_TRIGGER = 'snake';

// Shake detection thresholds
const SHAKE_THRESHOLD = 25; // m/s² — needs a real shake, not just hand movement
const SHAKE_COUNT_KONAMI = 3;
const SHAKE_WINDOW_MS = 1500;
const SHAKE_DEBOUNCE_MS = 2000;

// Tilt detection thresholds
const TILT_ANGLE = 25; // degrees left/right
const TILT_CROSSINGS_NEEDED = 4; // L-R-L-R = 4 direction changes
const TILT_WINDOW_MS = 3000;

export function useGestureTrigger(motionEnabled = false) {
  const [konamiActive, setKonamiActive] = useState(false);
  const [snakeActive, setSnakeActive] = useState(false);

  const konamiBufferRef = useRef<string[]>([]);
  const snakeBufferRef = useRef('');

  const resetKonami = useCallback(() => setKonamiActive(false), []);
  const resetSnake = useCallback(() => setSnakeActive(false), []);

  // ── Shake detection (Konami) ──
  useEffect(() => {
    if (!motionEnabled || konamiActive) return;

    const shakeTimestamps: number[] = [];
    let lastTrigger = 0;

    const onMotion = (e: DeviceMotionEvent) => {
      if (konamiActive || snakeActive) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

      if (magnitude > SHAKE_THRESHOLD) {
        const now = Date.now();

        // Debounce after trigger
        if (now - lastTrigger < SHAKE_DEBOUNCE_MS) return;

        shakeTimestamps.push(now);

        // Prune old timestamps outside window
        while (shakeTimestamps.length > 0 && now - shakeTimestamps[0] > SHAKE_WINDOW_MS) {
          shakeTimestamps.shift();
        }

        if (shakeTimestamps.length >= SHAKE_COUNT_KONAMI) {
          setKonamiActive(true);
          shakeTimestamps.length = 0;
          lastTrigger = now;
        }
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [motionEnabled, konamiActive, snakeActive]);

  // ── Tilt sequence detection (Snake) ──
  // ── Tilt sequence detection (Snake) ──
  // Tracks direction crossings: each time the phone crosses from left to right
  // or right to left past the threshold angle, that's one crossing.
  // L-R-L-R = 4 crossings within the time window.
  useEffect(() => {
    if (!motionEnabled || snakeActive) return;

    const crossingTimestamps: number[] = [];
    let lastSide: 'left' | 'right' | 'none' = 'none';

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (konamiActive || snakeActive) return;

      const gamma = e.gamma;
      if (gamma == null) return;

      let currentSide: 'left' | 'right' | 'none' = 'none';
      if (gamma < -TILT_ANGLE) currentSide = 'left';
      else if (gamma > TILT_ANGLE) currentSide = 'right';

      // Only count when crossing from one side to the other (not from/to neutral)
      if (currentSide !== 'none' && lastSide !== 'none' && currentSide !== lastSide) {
        const now = Date.now();
        crossingTimestamps.push(now);

        // Prune old crossings outside window
        while (crossingTimestamps.length > 0 && now - crossingTimestamps[0] > TILT_WINDOW_MS) {
          crossingTimestamps.shift();
        }

        if (crossingTimestamps.length >= TILT_CROSSINGS_NEEDED) {
          setSnakeActive(true);
          crossingTimestamps.length = 0;
        }
      }

      if (currentSide !== 'none') {
        lastSide = currentSide;
      }
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [motionEnabled, konamiActive, snakeActive]);

  // ── Keyboard: Konami code ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (konamiActive) return;

      konamiBufferRef.current.push(e.key);
      if (konamiBufferRef.current.length > KONAMI_SEQUENCE.length) {
        konamiBufferRef.current.shift();
      }

      if (KONAMI_SEQUENCE.every((k, i) => konamiBufferRef.current[i] === k)) {
        setKonamiActive(true);
        konamiBufferRef.current = [];
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [konamiActive]);

  // ── Keyboard: type "snake" ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (snakeActive) return;

      snakeBufferRef.current += e.key.toLowerCase();
      if (snakeBufferRef.current.length > 10) {
        snakeBufferRef.current = snakeBufferRef.current.slice(-10);
      }

      if (snakeBufferRef.current.endsWith(SNAKE_TRIGGER)) {
        setSnakeActive(true);
        snakeBufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [snakeActive]);

  return { konamiActive, snakeActive, resetKonami, resetSnake };
}
