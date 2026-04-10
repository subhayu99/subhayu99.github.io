import { useEffect, useRef, useCallback, useState } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const SNAKE_TRIGGER = 'snake';

// Shake detection thresholds
const SHAKE_THRESHOLD = 15; // m/s² — well above gravity (~9.8)
const SHAKE_COUNT_KONAMI = 3;
const SHAKE_WINDOW_MS = 1500;
const SHAKE_DEBOUNCE_MS = 2000;

// Tilt detection thresholds
const TILT_ANGLE = 25; // degrees left/right
const TILT_HOLD_MS = 200; // min hold time per tilt
const TILT_SEQUENCE: ('left' | 'right')[] = ['left', 'right', 'left', 'right'];
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
  useEffect(() => {
    if (!motionEnabled || snakeActive) return;

    type TiltEvent = { dir: 'left' | 'right'; time: number };
    const tiltEvents: TiltEvent[] = [];
    let currentTilt: 'left' | 'right' | 'neutral' = 'neutral';
    let tiltStart = 0;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (konamiActive || snakeActive) return;

      const gamma = e.gamma; // left-right tilt in degrees
      if (gamma == null) return;

      const now = Date.now();

      let newTilt: 'left' | 'right' | 'neutral' = 'neutral';
      if (gamma < -TILT_ANGLE) newTilt = 'left';
      else if (gamma > TILT_ANGLE) newTilt = 'right';

      if (newTilt !== 'neutral' && newTilt !== currentTilt) {
        // Started a new tilt direction
        if (currentTilt !== 'neutral' && now - tiltStart >= TILT_HOLD_MS) {
          // Record the previous tilt that was held long enough
          tiltEvents.push({ dir: currentTilt, time: now });

          // Prune old events outside window
          while (tiltEvents.length > 0 && now - tiltEvents[0].time > TILT_WINDOW_MS) {
            tiltEvents.shift();
          }

          // Check if last N events match the sequence
          if (tiltEvents.length >= TILT_SEQUENCE.length) {
            const recent = tiltEvents.slice(-TILT_SEQUENCE.length);
            const matches = TILT_SEQUENCE.every((dir, i) => recent[i].dir === dir);
            if (matches) {
              setSnakeActive(true);
              tiltEvents.length = 0;
            }
          }
        }
        currentTilt = newTilt;
        tiltStart = now;
      } else if (newTilt === 'neutral' && currentTilt !== 'neutral') {
        // Returned to neutral — record the tilt if held long enough
        if (now - tiltStart >= TILT_HOLD_MS) {
          tiltEvents.push({ dir: currentTilt, time: now });

          while (tiltEvents.length > 0 && now - tiltEvents[0].time > TILT_WINDOW_MS) {
            tiltEvents.shift();
          }

          if (tiltEvents.length >= TILT_SEQUENCE.length) {
            const recent = tiltEvents.slice(-TILT_SEQUENCE.length);
            const matches = TILT_SEQUENCE.every((dir, i) => recent[i].dir === dir);
            if (matches) {
              setSnakeActive(true);
              tiltEvents.length = 0;
            }
          }
        }
        currentTilt = 'neutral';
        tiltStart = 0;
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
