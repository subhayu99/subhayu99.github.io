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
  // ── Flip detection (Snake) ──
  // Flip phone face-down (Z goes negative) then back face-up to trigger Snake.
  useEffect(() => {
    if (!motionEnabled || snakeActive) return;

    let wasFlipped = false;
    let flipTime = 0;

    const onMotion = (e: DeviceMotionEvent) => {
      if (konamiActive || snakeActive) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.z == null) return;

      const now = Date.now();

      // Phone face-down: Z axis goes strongly negative (< -7)
      if (acc.z < -7 && !wasFlipped) {
        wasFlipped = true;
        flipTime = now;
      }

      // Phone flipped back face-up: Z positive (> 7), within 2s of flip
      if (wasFlipped && acc.z > 7) {
        if (now - flipTime < 2000) {
          setSnakeActive(true);
        }
        wasFlipped = false;
        flipTime = 0;
      }

      // Reset if took too long
      if (wasFlipped && now - flipTime > 2000) {
        wasFlipped = false;
        flipTime = 0;
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
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
