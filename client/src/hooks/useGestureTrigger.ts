import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Directional stroke-segment gesture recognizer.
 * Recognizes drawn letters "K" and "S" on touch devices,
 * plus keyboard triggers (Konami code / typing "snake") on desktop.
 */

type Dir = 'U' | 'D' | 'L' | 'R' | 'UR' | 'UL' | 'DR' | 'DL';
type Point = { x: number; y: number; t: number };

const MIN_PATH_LEN = 120; // px total path length
const MAX_GESTURE_MS = 2000; // max gesture duration
const SEGMENT_MIN_LEN = 30; // min px for a directional segment

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const SNAKE_TRIGGER = 'snake';

function getDirection(dx: number, dy: number): Dir {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const ratio = Math.min(ax, ay) / Math.max(ax, ay);

  // If one axis dominates (ratio < 0.4), it's a cardinal direction
  if (ratio < 0.4) {
    if (ax > ay) return dx > 0 ? 'R' : 'L';
    return dy > 0 ? 'D' : 'U';
  }
  // Diagonal
  if (dx > 0 && dy < 0) return 'UR';
  if (dx > 0 && dy > 0) return 'DR';
  if (dx < 0 && dy < 0) return 'UL';
  return 'DL';
}

function segmentize(points: Point[]): Dir[] {
  if (points.length < 3) return [];

  const segments: Dir[] = [];
  let segStart = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[segStart].x;
    const dy = points[i].y - points[segStart].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SEGMENT_MIN_LEN) continue;

    const dir = getDirection(dx, dy);

    // Only add if different from last segment
    if (segments.length === 0 || segments[segments.length - 1] !== dir) {
      segments.push(dir);
    }
    segStart = i;
  }

  return segments;
}

function totalPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// K: vertical down stroke, then up-right diagonal, then down-right diagonal
// Allows some flexibility in the exact sequence
function matchesK(segs: Dir[]): boolean {
  if (segs.length < 3 || segs.length > 5) return false;

  // Pattern: D → UR → DR  (the classic K shape)
  // Also accept: D → U → DR (if the user draws the arm as up then down-right)
  const patterns: Dir[][] = [
    ['D', 'UR', 'DR'],
    ['D', 'UR', 'R'],
    ['D', 'UR', 'D'],
    ['D', 'U', 'DR'],
    ['D', 'R', 'DR'],
  ];

  return patterns.some(pattern => {
    if (segs.length < pattern.length) return false;
    // Check if pattern appears as subsequence at start
    let pi = 0;
    for (let si = 0; si < segs.length && pi < pattern.length; si++) {
      if (segs[si] === pattern[pi]) pi++;
    }
    return pi === pattern.length;
  });
}

// S: right → down-left → right (S-curve)
function matchesS(segs: Dir[]): boolean {
  if (segs.length < 2 || segs.length > 5) return false;

  const patterns: Dir[][] = [
    ['R', 'DL', 'R'],
    ['R', 'D', 'R'],
    ['R', 'DL', 'DR'],
    ['R', 'D', 'L'],
    ['DR', 'DL', 'DR'],
    ['R', 'L', 'R'],
    ['DR', 'L', 'R'],
    ['DR', 'DL', 'R'],
  ];

  return patterns.some(pattern => {
    if (segs.length < pattern.length) return false;
    let pi = 0;
    for (let si = 0; si < segs.length && pi < pattern.length; si++) {
      if (segs[si] === pattern[pi]) pi++;
    }
    return pi === pattern.length;
  });
}

export function useGestureTrigger() {
  const [konamiActive, setKonamiActive] = useState(false);
  const [snakeActive, setSnakeActive] = useState(false);

  const touchPointsRef = useRef<Point[]>([]);
  const konamiBufferRef = useRef<string[]>([]);
  const snakeBufferRef = useRef('');

  const resetKonami = useCallback(() => setKonamiActive(false), []);
  const resetSnake = useCallback(() => setSnakeActive(false), []);

  // ── Touch gesture recognition ──
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (konamiActive || snakeActive) return;
      // Only single-finger gestures for letter drawing
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchPointsRef.current = [{ x: t.clientX, y: t.clientY, t: Date.now() }];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (konamiActive || snakeActive) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchPointsRef.current.push({ x: t.clientX, y: t.clientY, t: Date.now() });
    };

    const onTouchEnd = () => {
      if (konamiActive || snakeActive) return;
      const points = touchPointsRef.current;
      if (points.length < 5) return;

      const duration = points[points.length - 1].t - points[0].t;
      if (duration > MAX_GESTURE_MS) return;

      const pathLen = totalPathLength(points);
      if (pathLen < MIN_PATH_LEN) return;

      const segments = segmentize(points);
      if (segments.length < 2) return; // Must have direction changes (not a scroll)

      if (matchesK(segments)) {
        setKonamiActive(true);
      } else if (matchesS(segments)) {
        setSnakeActive(true);
      }

      touchPointsRef.current = [];
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [konamiActive, snakeActive]);

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
