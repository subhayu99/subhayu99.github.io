import { useMemo, useState, useId } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: { date: string; downloads: number }[];
  width?: number;
  height?: number;
  className?: string;
}

export default function Sparkline({ data, width = 140, height = 40, className = '' }: SparklineProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const { path, areaPath, points, maxVal } = useMemo(() => {
    if (!data.length) return { path: '', areaPath: '', points: [], maxVal: 0 };

    const maxVal = Math.max(...data.map(d => d.downloads), 1);
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - (d.downloads / maxVal) * h,
      ...d,
    }));

    // Smooth SVG path
    const pathParts = points.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
    });
    const path = pathParts.join(' ');

    // Area fill (path + close to bottom)
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const areaPath = `${path} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`;

    return { path, areaPath, points, maxVal };
  }, [data, width, height]);

  if (!data.length) return null;

  return (
    <div
      className={`relative ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Line */}
        <motion.path
          d={path}
          fill="none"
          stroke="rgb(245, 158, 11)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Hover hit areas */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - (width / points.length) / 2}
            y={0}
            width={width / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* Hover dot */}
        {hovered !== null && points[hovered] && (
          <circle
            cx={points[hovered].x}
            cy={points[hovered].y}
            r={3}
            fill="rgb(245, 158, 11)"
            className="drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hovered !== null && points[hovered] && (
        <div
          className="absolute -top-8 px-2 py-0.5 bg-zinc-900 border border-white/10 rounded text-[10px] font-mono text-gui-accent whitespace-nowrap pointer-events-none z-10"
          style={{ left: points[hovered].x, transform: 'translateX(-50%)' }}
        >
          {points[hovered].downloads.toLocaleString()} / wk
        </div>
      )}
    </div>
  );
}
