import { useEffect, useRef, useCallback, useState } from 'react';
import { cycleTheme, applyColorTheme, colorThemes, type ColorTheme } from '../config/gui-theme.config';

const SNAKE_TRIGGER = 'snake';
const REFLEX_TRIGGER = 'reflex';
const RACER_TRIGGER = 'racer';
const HELP_TRIGGER = 'help';

// Shake detection thresholds
const SHAKE_THRESHOLD = 25;
const SHAKE_COUNT = 3;
const SHAKE_WINDOW_MS = 1500;
const SHAKE_DEBOUNCE_MS = 2000;

// T-key timing: how long to wait for a digit after pressing T
const T_KEY_WINDOW_MS = 400;

export function useGestureTrigger(motionEnabled = false) {
  const [themeFlash, setThemeFlash] = useState<ColorTheme | null>(null);
  const [snakeActive, setSnakeActive] = useState(false);
  const [reflexActive, setReflexActive] = useState(false);
  const [racerActive, setRacerActive] = useState(false);
  const [helpActive, setHelpActive] = useState(false);

  const snakeBufferRef = useRef('');
  const tTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tPendingRef = useRef(false);

  const resetThemeFlash = useCallback(() => setThemeFlash(null), []);
  const resetSnake = useCallback(() => setSnakeActive(false), []);
  const resetReflex = useCallback(() => setReflexActive(false), []);
  const resetRacer = useCallback(() => setRacerActive(false), []);
  const resetHelp = useCallback(() => setHelpActive(false), []);

  const triggerThemeCycle = useCallback(() => {
    const next = cycleTheme();
    setThemeFlash(next);
  }, []);

  const triggerThemeJump = useCallback((index: number) => {
    if (index < 0 || index >= colorThemes.length) return;
    const theme = colorThemes[index];
    applyColorTheme(theme);
    setThemeFlash(theme);
  }, []);

  // ── Shake detection (theme cycle) ──
  useEffect(() => {
    if (!motionEnabled) return;

    const shakeTimestamps: number[] = [];
    let lastTrigger = 0;

    const onMotion = (e: DeviceMotionEvent) => {
      if (snakeActive || themeFlash) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

      if (magnitude > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastTrigger < SHAKE_DEBOUNCE_MS) return;

        shakeTimestamps.push(now);
        while (shakeTimestamps.length > 0 && now - shakeTimestamps[0] > SHAKE_WINDOW_MS) {
          shakeTimestamps.shift();
        }

        if (shakeTimestamps.length >= SHAKE_COUNT) {
          triggerThemeCycle();
          shakeTimestamps.length = 0;
          lastTrigger = now;
        }
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [motionEnabled, snakeActive, themeFlash, triggerThemeCycle]);

  // ── Flip detection (Snake) ──
  useEffect(() => {
    if (!motionEnabled || snakeActive) return;

    let wasFlipped = false;
    let flipTime = 0;

    const onMotion = (e: DeviceMotionEvent) => {
      if (snakeActive || themeFlash) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.z == null) return;

      const now = Date.now();

      if (acc.z < -7 && !wasFlipped) {
        wasFlipped = true;
        flipTime = now;
      }

      if (wasFlipped && acc.z > 7) {
        if (now - flipTime < 2000) setSnakeActive(true);
        wasFlipped = false;
        flipTime = 0;
      }

      if (wasFlipped && now - flipTime > 2000) {
        wasFlipped = false;
        flipTime = 0;
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [motionEnabled, snakeActive, themeFlash]);

  // ── Keyboard: T (cycle) / T1-T5 (jump) / "snake" ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;

      // T-key theme switching
      if (key.toLowerCase() === 't' && !tPendingRef.current && !snakeActive && !themeFlash) {
        tPendingRef.current = true;
        tTimerRef.current = setTimeout(() => {
          // T alone — cycle to next theme
          tPendingRef.current = false;
          tTimerRef.current = null;
          triggerThemeCycle();
        }, T_KEY_WINDOW_MS);
        return;
      }

      // Digit after T — jump to specific theme
      if (tPendingRef.current && key >= '1' && key <= String(colorThemes.length)) {
        if (tTimerRef.current) { clearTimeout(tTimerRef.current); tTimerRef.current = null; }
        tPendingRef.current = false;
        triggerThemeJump(parseInt(key) - 1);
        return;
      }

      // Any other key cancels pending T
      if (tPendingRef.current && key.toLowerCase() !== 't') {
        if (tTimerRef.current) { clearTimeout(tTimerRef.current); tTimerRef.current = null; }
        tPendingRef.current = false;
      }

      // Word triggers (snake, reflex, racer, help)
      if (snakeActive || reflexActive || racerActive || helpActive) return;
      snakeBufferRef.current += key.toLowerCase();
      if (snakeBufferRef.current.length > 10) {
        snakeBufferRef.current = snakeBufferRef.current.slice(-10);
      }
      if (snakeBufferRef.current.endsWith(SNAKE_TRIGGER)) {
        setSnakeActive(true);
        snakeBufferRef.current = '';
      } else if (snakeBufferRef.current.endsWith(REFLEX_TRIGGER)) {
        setReflexActive(true);
        snakeBufferRef.current = '';
      } else if (snakeBufferRef.current.endsWith(RACER_TRIGGER)) {
        setRacerActive(true);
        snakeBufferRef.current = '';
      } else if (snakeBufferRef.current.endsWith(HELP_TRIGGER)) {
        setHelpActive(true);
        snakeBufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (tTimerRef.current) clearTimeout(tTimerRef.current);
    };
  }, [snakeActive, reflexActive, racerActive, helpActive, themeFlash, triggerThemeCycle, triggerThemeJump]);

  return {
    themeFlash, snakeActive, reflexActive, racerActive, helpActive,
    resetThemeFlash, resetSnake, resetReflex, resetRacer, resetHelp,
    triggerReflex: () => setReflexActive(true),
    triggerRacer: () => setRacerActive(true),
    triggerHelp: () => setHelpActive(true),
  };
}
