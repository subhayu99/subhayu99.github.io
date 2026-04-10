import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccentRgb } from '../../config/gui-theme.config';

const CELL_SIZE_TARGET = 20; // px per cell — grid adapts to screen
const TICK_MS = 100;
const SWIPE_THRESHOLD = 30;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

interface SnakeGameProps {
  active: boolean;
  onClose: () => void;
}

const LS_KEY = 'snake-high-score';

export default function SnakeGame({ active, onClose }: SnakeGameProps) {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>([]);
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastInputRef = useRef(0);
  const [autopilot, setAutopilot] = useState(false);
  const splashCanvasRef = useRef<HTMLCanvasElement>(null);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    screen.orientation?.unlock?.();
  }, []);

  const close = useCallback(() => {
    setScore(0);
    setGameOver(false);
    setStarted(false);
    if (tickRef.current) clearInterval(tickRef.current);
    cancelAnimationFrame(rafRef.current);
    exitFullscreen();
    onClose();
  }, [onClose, exitFullscreen]);

  // Enter fullscreen + lock orientation + start the game
  // Called from "TAP TO PLAY" splash (user gesture required for fullscreen)
  const enterAndStart = useCallback(() => {
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().then(() => {
        (screen.orientation as any)?.lock?.('portrait').catch(() => {});
      }).catch(() => {});
    }
    setStarted(true);
  }, []);

  const placeFood = useCallback((snake: Point[], cols: number, rows: number): Point => {
    let food: Point;
    do {
      food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snake.some(s => s.x === food.x && s.y === food.y));
    return food;
  }, []);

  const applyDirection = useCallback((newDir: Direction) => {
    const dir = dirRef.current;
    if (newDir === 'UP' && dir !== 'DOWN') nextDirRef.current = 'UP';
    if (newDir === 'DOWN' && dir !== 'UP') nextDirRef.current = 'DOWN';
    if (newDir === 'LEFT' && dir !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && dir !== 'LEFT') nextDirRef.current = 'RIGHT';
    lastInputRef.current = Date.now();
    setAutopilot(false);
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill entire screen edge-to-edge
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cellSize = Math.max(CELL_SIZE_TARGET, Math.floor(Math.min(w, h) / 25));
    const cols = Math.floor(w / cellSize);
    const rows = Math.floor(h / cellSize);
    const canvasW = cols * cellSize;
    const canvasH = rows * cellSize;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [r, g, b] = getAccentRgb();

    const startSnake: Point[] = [
      { x: 5, y: Math.floor(rows / 2) },
      { x: 4, y: Math.floor(rows / 2) },
      { x: 3, y: Math.floor(rows / 2) },
    ];
    snakeRef.current = startSnake;
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    foodRef.current = placeFood(startSnake, cols, rows);
    scoreRef.current = 0;
    gameOverRef.current = false;
    lastInputRef.current = Date.now();
    setScore(0);
    setGameOver(false);
    setAutopilot(false);

    function drawGrid() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, canvasW, canvasH);
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
      ctx!.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        ctx!.beginPath();
        ctx!.moveTo(i * cellSize, 0);
        ctx!.lineTo(i * cellSize, canvasH);
        ctx!.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        ctx!.beginPath();
        ctx!.moveTo(0, i * cellSize);
        ctx!.lineTo(canvasW, i * cellSize);
        ctx!.stroke();
      }
    }

    function drawSnake() {
      const snake = snakeRef.current;
      for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        const alpha = 1 - (i / snake.length) * 0.5;
        if (i === 0) {
          ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
          ctx!.shadowBlur = 8;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
      ctx!.shadowBlur = 0;
    }

    function drawFood() {
      const food = foodRef.current;
      const cx = food.x * cellSize + cellSize / 2;
      const cy = food.y * cellSize + cellSize / 2;
      const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, cellSize);
      grad.addColorStop(0, `rgba(255, 50, 50, ${0.3 * pulse})`);
      grad.addColorStop(1, 'transparent');
      ctx!.fillStyle = grad;
      ctx!.fillRect(food.x * cellSize - cellSize / 2, food.y * cellSize - cellSize / 2, cellSize * 2, cellSize * 2);

      ctx!.fillStyle = `rgba(255, 80, 80, ${pulse})`;
      ctx!.fillRect(food.x * cellSize + 3, food.y * cellSize + 3, cellSize - 6, cellSize - 6);
    }

    const AUTOPILOT_MS = 6000;
    const ALL_DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const OPP: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    const DELTA: Record<Direction, Point> = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };

    function tick() {
      if (gameOverRef.current) return;

      const snake = snakeRef.current;
      const isIdle = lastInputRef.current > 0 && Date.now() - lastInputRef.current > AUTOPILOT_MS;

      // Auto-pilot: AI steers after idle, doesn't count score
      if (isIdle) {
        setAutopilot(true);
        const head = snake[0];
        const food = foodRef.current;
        const curDir = nextDirRef.current;

        const candidates = ALL_DIRS
          .filter(d => d !== OPP[curDir])
          .map(d => {
            const nx = (head.x + DELTA[d].x + cols) % cols;
            const ny = (head.y + DELTA[d].y + rows) % rows;
            const safe = !snake.some(s => s.x === nx && s.y === ny);
            const dist = Math.abs(nx - food.x) + Math.abs(ny - food.y);
            return { d, safe, dist };
          })
          .filter(c => c.safe)
          .sort((a, b) => a.dist - b.dist);

        if (candidates.length > 0) {
          nextDirRef.current = Math.random() < 0.7 ? candidates[0].d : candidates[Math.floor(Math.random() * candidates.length)].d;
        }
      }

      dirRef.current = nextDirRef.current;
      const head = { ...snake[0] };

      switch (dirRef.current) {
        case 'UP': head.y--; break;
        case 'DOWN': head.y++; break;
        case 'LEFT': head.x--; break;
        case 'RIGHT': head.x++; break;
      }

      // Wrap around edges
      if (head.x < 0) head.x = cols - 1;
      else if (head.x >= cols) head.x = 0;
      if (head.y < 0) head.y = rows - 1;
      else if (head.y >= rows) head.y = 0;

      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        if (isIdle) {
          // Auto-pilot collision — silently reset instead of game over
          snakeRef.current = [
            { x: 5, y: Math.floor(rows / 2) },
            { x: 4, y: Math.floor(rows / 2) },
            { x: 3, y: Math.floor(rows / 2) },
          ];
          dirRef.current = 'RIGHT';
          nextDirRef.current = 'RIGHT';
          return;
        }
        gameOverRef.current = true;
        setGameOver(true);
        if (scoreRef.current > (parseInt(localStorage.getItem(LS_KEY) || '0', 10))) {
          localStorage.setItem(LS_KEY, String(scoreRef.current));
          setHighScore(scoreRef.current);
        }
        return;
      }

      snake.unshift(head);

      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        if (!isIdle) {
          // Only count score during player control
          scoreRef.current += 10;
          setScore(scoreRef.current);
        }
        foodRef.current = placeFood(snake, cols, rows);
      } else {
        snake.pop();
      }
    }

    // 60fps render loop decoupled from game tick
    let prevSnakeHead: Point | null = null;

    function render() {
      if (!active) return;
      drawGrid();
      drawFood();

      const snake = snakeRef.current;
      if (snake.length > 0 && prevSnakeHead) {
        const elapsed = Date.now() - lastTickRef.current;
        const t = Math.min(elapsed / TICK_MS, 1);
        const head = snake[0];

        // Skip interpolation on edge wraps (distance > 2 cells = wrapping)
        const dx = Math.abs(head.x - prevSnakeHead.x);
        const dy = Math.abs(head.y - prevSnakeHead.y);
        const isWrapping = dx > 2 || dy > 2;

        // Draw body
        for (let i = 1; i < snake.length; i++) {
          const seg = snake[i];
          const alpha = 1 - (i / snake.length) * 0.5;
          ctx!.shadowBlur = 0;
          ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx!.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }

        // Draw head — interpolated unless wrapping
        const drawX = isWrapping ? head.x : prevSnakeHead.x + (head.x - prevSnakeHead.x) * t;
        const drawY = isWrapping ? head.y : prevSnakeHead.y + (head.y - prevSnakeHead.y) * t;

        ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
        ctx!.shadowBlur = 8;
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx!.fillRect(drawX * cellSize + 1, drawY * cellSize + 1, cellSize - 2, cellSize - 2);
        ctx!.shadowBlur = 0;
      } else {
        drawSnake();
      }

      rafRef.current = requestAnimationFrame(render);
    }

    if (tickRef.current) clearInterval(tickRef.current);
    cancelAnimationFrame(rafRef.current);
    lastTickRef.current = Date.now();

    tickRef.current = setInterval(() => {
      prevSnakeHead = snakeRef.current.length > 0 ? { ...snakeRef.current[0] } : null;
      tick();
      lastTickRef.current = Date.now();
    }, TICK_MS);

    rafRef.current = requestAnimationFrame(render);
  }, [active, placeFood]);

  // Keyboard controls
  useEffect(() => {
    if (!active) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }

      // Enter to start from splash or retry from game over
      if (e.key === 'Enter') {
        if (!started) { enterAndStart(); e.preventDefault(); return; }
        if (gameOverRef.current) { startGame(); e.preventDefault(); return; }
      }

      if (gameOverRef.current) return;

      switch (e.key) {
        case 'ArrowUp': applyDirection('UP'); break;
        case 'ArrowDown': applyDirection('DOWN'); break;
        case 'ArrowLeft': applyDirection('LEFT'); break;
        case 'ArrowRight': applyDirection('RIGHT'); break;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, started, close, startGame, enterAndStart, applyDirection]);

  // Swipe + tap controls on canvas
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (Math.max(ax, ay) < SWIPE_THRESHOLD) {
        if (gameOverRef.current) startGame();
        return;
      }

      if (gameOverRef.current) return;

      if (ax > ay) {
        applyDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        applyDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [active, started, startGame, applyDirection]);

  // Screensaver — self-playing snake behind the splash screen
  useEffect(() => {
    if (!active || started) return;
    const canvas = splashCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cell = Math.max(16, Math.floor(Math.min(w, h) / 30));
    const cols = Math.floor(w / cell);
    const rows = Math.floor(h / cell);
    const cw = cols * cell;
    const ch = rows * cell;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [r, g, b] = getAccentRgb();
    const ALL_DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const OPP: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    const DELTA: Record<Direction, Point> = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };

    let snake: Point[] = [
      { x: 5, y: Math.floor(rows / 2) },
      { x: 4, y: Math.floor(rows / 2) },
      { x: 3, y: Math.floor(rows / 2) },
    ];
    let dir: Direction = 'RIGHT';
    let food: Point = { x: Math.floor(cols / 2), y: Math.floor(rows / 3) };

    function aiTick() {
      const head = snake[0];
      // Pick a safe direction, prefer toward food
      const candidates = ALL_DIRS
        .filter(d => d !== OPP[dir])
        .map(d => {
          const nx = (head.x + DELTA[d].x + cols) % cols;
          const ny = (head.y + DELTA[d].y + rows) % rows;
          const safe = !snake.some(s => s.x === nx && s.y === ny);
          const dist = Math.abs(nx - food.x) + Math.abs(ny - food.y);
          return { d, safe, dist };
        })
        .filter(c => c.safe)
        .sort((a, b) => a.dist - b.dist);

      if (candidates.length > 0) {
        // 70% pick best, 30% random — so it doesn't look robotic
        dir = Math.random() < 0.7 ? candidates[0].d : candidates[Math.floor(Math.random() * candidates.length)].d;
      }

      const newHead = {
        x: (head.x + DELTA[dir].x + cols) % cols,
        y: (head.y + DELTA[dir].y + rows) % rows,
      };

      if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        // Reset on collision
        snake = [
          { x: 5, y: Math.floor(rows / 2) },
          { x: 4, y: Math.floor(rows / 2) },
          { x: 3, y: Math.floor(rows / 2) },
        ];
        dir = 'RIGHT';
        return;
      }

      snake.unshift(newHead);
      if (newHead.x === food.x && newHead.y === food.y) {
        let f: Point;
        do { f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
        while (snake.some(s => s.x === f.x && s.y === f.y));
        food = f;
      } else {
        snake.pop();
      }
    }

    function render() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, cw, ch);

      // Draw snake at low opacity — it's a background screensaver
      for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        const alpha = (1 - (i / snake.length) * 0.6) * 0.25;
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
      }

      // Food
      const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.2;
      ctx!.fillStyle = `rgba(255, 80, 80, ${pulse})`;
      ctx!.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);
    }

    const tickId = setInterval(aiTick, 120);
    let rafId: number;
    const loop = () => { render(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);

    return () => {
      clearInterval(tickId);
      cancelAnimationFrame(rafId);
    };
  }, [active, started]);

  // Start game when player taps to play
  useEffect(() => {
    if (active && started) startGame();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, started, startGame]);

  // Exit fullscreen if user exits via browser gesture (swipe down on Android)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && active) {
        // User exited fullscreen externally — that's fine, game continues
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [active]);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!started ? (
            // Tap-to-play splash — click anywhere or press Enter to start
            <div className="absolute inset-0 cursor-pointer" onClick={enterAndStart}>
              <canvas ref={splashCanvasRef} className="absolute inset-0 w-full h-full" />
              <motion.div
                className="relative z-10 flex flex-col items-center justify-center gap-6 select-none h-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-display text-green-400 text-5xl sm:text-7xl tracking-wider">SNAKE</h2>
                {highScore > 0 && (
                  <p className="text-zinc-500 font-mono text-sm">HIGH SCORE: {highScore}</p>
                )}
                <motion.p
                  className="text-green-400/70 font-mono text-sm mt-4"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isTouchDevice ? 'TAP ANYWHERE TO PLAY' : 'PRESS ENTER OR CLICK TO PLAY'}
                </motion.p>
                <p className="text-zinc-600 font-mono text-xs">
                  {isTouchDevice ? 'Swipe to steer' : 'Arrow keys to move'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); close(); }}
                  className="mt-4 px-4 py-2 border border-white/10 text-zinc-500 font-mono text-xs hover:text-zinc-300 transition-colors"
                >
                  BACK
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Canvas — fills entire screen */}
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {/* HUD overlay — top of screen */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 font-mono text-xs z-10 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">SNAKE</span>
                  <span className="text-white">SCORE: {score}</span>
                  {highScore > 0 && <span className="text-zinc-500">BEST: {highScore}</span>}
                  {autopilot && <span className="text-yellow-400/60 animate-pulse">AUTO</span>}
                </div>
                <button
                  onClick={close}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Game over overlay */}
              {gameOver && (
                <motion.div
                  className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h3 className="font-display text-red-400 text-4xl mb-2">GAME OVER</h3>
                  <p className="text-white font-mono text-lg mb-1">Score: {score}</p>
                  {score >= highScore && score > 0 ? (
                    <p className="text-green-400 font-mono text-xs mb-4">NEW HIGH SCORE!</p>
                  ) : highScore > 0 ? (
                    <p className="text-zinc-500 font-mono text-xs mb-4">Best: {highScore}</p>
                  ) : <div className="mb-4" />}
                  <div className="flex gap-4 font-mono text-sm">
                    <button
                      onClick={startGame}
                      className="px-4 py-2 border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      {isTouchDevice ? 'TAP TO ' : '[ENTER] '}RETRY
                    </button>
                    <button
                      onClick={close}
                      className="px-4 py-2 border border-white/20 text-zinc-400 hover:text-white transition-colors"
                    >
                      QUIT
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
