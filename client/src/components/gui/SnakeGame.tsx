import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { guiTheme } from '../../config/gui-theme.config';

const GRID_SIZE = 20;
const TICK_MS = 120;
const SWIPE_THRESHOLD = 30;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

interface SnakeGameProps {
  active: boolean;
  onClose: () => void;
}

export default function SnakeGame({ active, onClose }: SnakeGameProps) {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>([]);
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const close = useCallback(() => {
    setScore(0);
    setGameOver(false);
    if (tickRef.current) clearInterval(tickRef.current);
    onClose();
  }, [onClose]);

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
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.65, 600);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellSize = size / GRID_SIZE;
    const cols = GRID_SIZE;
    const rows = GRID_SIZE;
    const [r, g, b] = guiTheme.accentRgb;

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
    setScore(0);
    setGameOver(false);

    function drawGrid() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, size, size);
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
      ctx!.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        ctx!.beginPath();
        ctx!.moveTo(i * cellSize, 0);
        ctx!.lineTo(i * cellSize, size);
        ctx!.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        ctx!.beginPath();
        ctx!.moveTo(0, i * cellSize);
        ctx!.lineTo(size, i * cellSize);
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

    function tick() {
      if (gameOverRef.current) return;

      dirRef.current = nextDirRef.current;
      const snake = snakeRef.current;
      const head = { ...snake[0] };

      switch (dirRef.current) {
        case 'UP': head.y--; break;
        case 'DOWN': head.y++; break;
        case 'LEFT': head.x--; break;
        case 'RIGHT': head.x++; break;
      }

      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        foodRef.current = placeFood(snake, cols, rows);
      } else {
        snake.pop();
      }
    }

    function render() {
      if (!active) return;
      drawGrid();
      drawFood();
      drawSnake();
    }

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      tick();
      render();
    }, TICK_MS);

    render();
  }, [active, placeFood]);

  // Keyboard controls
  useEffect(() => {
    if (!active) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }

      if (gameOverRef.current) {
        if (e.key === 'Enter') startGame();
        return;
      }

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
  }, [active, close, startGame, applyDirection]);

  // Gyro controls — tilt phone to steer snake
  useEffect(() => {
    if (!active) return;
    const hasMotion = localStorage.getItem('motionPermission') === 'granted';
    if (!hasMotion) return;

    const TILT_DEADZONE = 15; // degrees — must tilt past this to change direction
    let lastGyroDir: Direction | null = null;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (gameOverRef.current) return;

      const gamma = e.gamma; // left-right tilt (-90 to 90)
      const beta = e.beta;   // front-back tilt (-180 to 180)
      if (gamma == null || beta == null) return;

      // Determine dominant tilt direction
      const absGamma = Math.abs(gamma);
      const absBeta = Math.abs(beta - 45); // offset by 45° since phone is usually held at ~45°

      if (absGamma > absBeta && absGamma > TILT_DEADZONE) {
        // Left-right tilt dominates
        const dir: Direction = gamma < 0 ? 'LEFT' : 'RIGHT';
        if (dir !== lastGyroDir) {
          applyDirection(dir);
          lastGyroDir = dir;
        }
      } else if (absBeta > absGamma && absBeta > TILT_DEADZONE) {
        // Front-back tilt dominates
        const dir: Direction = (beta - 45) < 0 ? 'UP' : 'DOWN';
        if (dir !== lastGyroDir) {
          applyDirection(dir);
          lastGyroDir = dir;
        }
      }
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [active, applyDirection]);

  // Swipe + tap fallback controls on canvas
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
      e.preventDefault(); // Prevent page scroll while playing
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
        // Tap — on game over, restart
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
  }, [active, startGame, applyDirection]);

  // Start game when activated
  useEffect(() => {
    if (active) startGame();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [active, startGame]);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center gap-6 sm:gap-8 mb-4 font-mono text-sm">
            <span className="text-green-400">SNAKE</span>
            <span className="text-white">SCORE: {score}</span>
            <button
              onClick={close}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              CLOSE
            </button>
          </div>

          {/* Canvas */}
          <div className="relative border border-green-500/30">
            <canvas ref={canvasRef} />

            {/* Game over overlay */}
            {gameOver && (
              <motion.div
                className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3 className="font-display text-red-400 text-4xl mb-2">GAME OVER</h3>
                <p className="text-white font-mono text-lg mb-4">Score: {score}</p>
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
          </div>

          <p className="text-zinc-600 font-mono text-xs mt-4">
            {isTouchDevice ? 'Tilt to steer · Swipe or tap to retry' : 'Arrow keys to move'}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
