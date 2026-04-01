import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { guiTheme } from '../../config/gui-theme.config';

const GRID_SIZE = 20;
const TICK_MS = 120;
const TRIGGER_WORD = 'snake';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

export default function SnakeGame() {
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef('');

  // Direction refs to avoid stale closures in game loop
  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>([]);
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  // Listen for "snake" typed anywhere
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (active) return;

      bufferRef.current += e.key.toLowerCase();
      if (bufferRef.current.length > 10) bufferRef.current = bufferRef.current.slice(-10);
      if (bufferRef.current.endsWith(TRIGGER_WORD)) {
        setActive(true);
        bufferRef.current = '';
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active]);

  const close = useCallback(() => {
    setActive(false);
    setScore(0);
    setGameOver(false);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const placeFood = useCallback((snake: Point[], cols: number, rows: number): Point => {
    let food: Point;
    do {
      food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snake.some(s => s.x === food.x && s.y === food.y));
    return food;
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.7, 600);
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

    // Init snake
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

      // Faint grid lines
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
          // Head glow
          ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
          ctx!.shadowBlur = 8;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fillRect(
          seg.x * cellSize + 1,
          seg.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
      }
      ctx!.shadowBlur = 0;
    }

    function drawFood() {
      const food = foodRef.current;
      const cx = food.x * cellSize + cellSize / 2;
      const cy = food.y * cellSize + cellSize / 2;
      const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;

      // Glow
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, cellSize);
      grad.addColorStop(0, `rgba(255, 50, 50, ${0.3 * pulse})`);
      grad.addColorStop(1, 'transparent');
      ctx!.fillStyle = grad;
      ctx!.fillRect(food.x * cellSize - cellSize / 2, food.y * cellSize - cellSize / 2, cellSize * 2, cellSize * 2);

      // Food body
      ctx!.fillStyle = `rgba(255, 80, 80, ${pulse})`;
      ctx!.fillRect(
        food.x * cellSize + 3,
        food.y * cellSize + 3,
        cellSize - 6,
        cellSize - 6,
      );
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

      // Wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      // Eat food
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

    // Game loop
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      tick();
      render();
    }, TICK_MS);

    // Initial render
    render();
  }, [active, placeFood]);

  // Direction keys
  useEffect(() => {
    if (!active) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }

      if (gameOverRef.current) {
        if (e.key === 'Enter') startGame();
        return;
      }

      const dir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp': if (dir !== 'DOWN') nextDirRef.current = 'UP'; break;
        case 'ArrowDown': if (dir !== 'UP') nextDirRef.current = 'DOWN'; break;
        case 'ArrowLeft': if (dir !== 'RIGHT') nextDirRef.current = 'LEFT'; break;
        case 'ArrowRight': if (dir !== 'LEFT') nextDirRef.current = 'RIGHT'; break;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, close, startGame]);

  // Start game when activated
  useEffect(() => {
    if (active) startGame();
  }, [active, startGame]);

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
          <div className="flex items-center gap-8 mb-4 font-mono text-sm">
            <span className="text-green-400">SNAKE</span>
            <span className="text-white">SCORE: {score}</span>
            <button
              onClick={close}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              [ESC] CLOSE
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
                    [ENTER] RETRY
                  </button>
                  <button
                    onClick={close}
                    className="px-4 py-2 border border-white/20 text-zinc-400 hover:text-white transition-colors"
                  >
                    [ESC] QUIT
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <p className="text-zinc-600 font-mono text-xs mt-4">Arrow keys to move</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
