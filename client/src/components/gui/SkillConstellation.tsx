import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface SkillNode {
  id: string;
  label: string;
  group: string;
  size: number;
}

interface GroupInfo {
  label: string;
  color: string;
}

interface SkillGraphData {
  nodes: SkillNode[];
  edges: { source: string; target: string }[];
  groups: Record<string, GroupInfo>;
}

interface FloatingNode extends SkillNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  driftAngle: number;
  driftSpeed: number;
  driftRadius: number;
  nodeRadius: number;
  phase: number;
}

interface SkillConstellationProps {
  data: SkillGraphData;
}

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export default function SkillConstellation({ data }: SkillConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<FloatingNode[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [hovered, setHovered] = useState<FloatingNode | null>(null);
  const [dimensions, setDimensions] = useState({ w: 900, h: 560 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Adjacency
  const adjRef = useRef<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    const adj = new Map<string, Set<string>>();
    data.edges.forEach(({ source, target }) => {
      if (!adj.has(source)) adj.set(source, new Set());
      if (!adj.has(target)) adj.set(target, new Set());
      adj.get(source)!.add(target);
      adj.get(target)!.add(source);
    });
    adjRef.current = adj;
  }, [data.edges]);

  // Initialize floating nodes — spread loosely by group
  useEffect(() => {
    const groups = Object.keys(data.groups);
    const w = dimensions.w;
    const h = dimensions.h;
    const pad = 60;
    const allNodes: FloatingNode[] = [];

    // Distribute groups into regions
    const cols = groups.length;
    const colW = (w - pad * 2) / cols;

    groups.forEach((groupKey, gi) => {
      const groupNodes = data.nodes.filter((n) => n.group === groupKey);
      const cx = pad + colW * gi + colW / 2;

      // Distribute nodes in a loose cloud within the column
      const nodesPerCol = groupNodes.length;
      const rows = Math.ceil(Math.sqrt(nodesPerCol));
      const rowH = (h - pad * 2) / (rows + 1);

      groupNodes.forEach((n, i) => {
        const row = Math.floor(i / rows);
        const col = i % rows;
        const baseX = cx + (col - rows / 2) * 50 + (Math.random() - 0.5) * 30;
        const baseY = pad + rowH * (row + 1) + (Math.random() - 0.5) * 30;

        allNodes.push({
          ...n,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          baseX,
          baseY,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: 0.15 + Math.random() * 0.25,
          driftRadius: 8 + Math.random() * 15,
          nodeRadius: 5 + n.size * 2.5,
          phase: Math.random() * Math.PI * 2,
        });
      });
    });

    nodesRef.current = allNodes;
  }, [data, dimensions]);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDimensions({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const adj = adjRef.current;
    let dprSet = false;

    const tick = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const nodes = nodesRef.current;
      const w = dimensions.w;
      const h = dimensions.h;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Canvas setup
      const dpr = window.devicePixelRatio || 1;
      if (!dprSet) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
        dprSet = true;
      }
      ctx.clearRect(0, 0, w, h);

      const hovId = hoveredRef.current;
      const hovNeighbors = hovId ? adj.get(hovId) : null;
      const hovNode = hovId ? nodes.find((n) => n.id === hovId) : null;

      // === Update positions — gentle drift ===
      for (const n of nodes) {
        n.driftAngle += n.driftSpeed * 0.016;
        const targetX = n.baseX + Math.cos(n.driftAngle) * n.driftRadius;
        const targetY = n.baseY + Math.sin(n.driftAngle * 0.7 + n.phase) * n.driftRadius * 0.6;

        // If this node is a neighbor of hovered, pull toward hovered node
        if (hovNode && hovNeighbors?.has(n.id)) {
          const pullX = hovNode.x + (n.x - hovNode.x) * 0.6;
          const pullY = hovNode.y + (n.y - hovNode.y) * 0.6;
          n.x += (pullX - n.x) * 0.03;
          n.y += (pullY - n.y) * 0.03;
        } else {
          n.x += (targetX - n.x) * 0.02;
          n.y += (targetY - n.y) * 0.02;
        }

        // Mouse repulsion (gentle push)
        const mdx = n.x - mx;
        const mdy = n.y - my;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
        if (mDist < 80 && n.id !== hovId) {
          const push = (80 - mDist) * 0.015;
          n.x += (mdx / mDist) * push;
          n.y += (mdy / mDist) * push;
        }

        // Soft boundary
        n.x = Math.max(n.nodeRadius + 10, Math.min(w - n.nodeRadius - 10, n.x));
        n.y = Math.max(n.nodeRadius + 10, Math.min(h - n.nodeRadius - 10, n.y));
      }

      // === Draw ambient connections (very faint lines between nearby same-group nodes) ===
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].group !== nodes[j].group) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.06;
            const rgb = hexToRgb(data.groups[nodes[i].group]?.color ?? '#fff');
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // === Draw elastic connections on hover ===
      if (hovNode && hovNeighbors) {
        hovNeighbors.forEach((nid) => {
          const neighbor = nodes.find((n) => n.id === nid);
          if (!neighbor) return;

          const dx = neighbor.x - hovNode.x;
          const dy = neighbor.y - hovNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nRgb = hexToRgb(data.groups[neighbor.group]?.color ?? '#fff');
          const hRgb = hexToRgb(data.groups[hovNode.group]?.color ?? '#fff');

          // Elastic band effect — curved line with control point pulled toward center
          const midX = (hovNode.x + neighbor.x) / 2;
          const midY = (hovNode.y + neighbor.y) / 2;
          // Perpendicular offset for curve
          const perpX = -dy / dist * 15;
          const perpY = dx / dist * 15;
          const ctrlX = midX + perpX * Math.sin(t * 2);
          const ctrlY = midY + perpY * Math.sin(t * 2);

          // Gradient along the elastic
          const grad = ctx.createLinearGradient(hovNode.x, hovNode.y, neighbor.x, neighbor.y);
          grad.addColorStop(0, `rgba(${hRgb.r},${hRgb.g},${hRgb.b},0.3)`);
          grad.addColorStop(1, `rgba(${nRgb.r},${nRgb.g},${nRgb.b},0.3)`);

          ctx.beginPath();
          ctx.moveTo(hovNode.x, hovNode.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, neighbor.x, neighbor.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Animated dot along the elastic
          const dotT = (t * 1.2 + Math.random() * 0.01) % 1;
          const bx = (1 - dotT) * (1 - dotT) * hovNode.x + 2 * (1 - dotT) * dotT * ctrlX + dotT * dotT * neighbor.x;
          const by = (1 - dotT) * (1 - dotT) * hovNode.y + 2 * (1 - dotT) * dotT * ctrlY + dotT * dotT * neighbor.y;
          ctx.beginPath();
          ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fill();
        });
      }

      // === Draw nodes ===
      for (const n of nodes) {
        const groupColor = data.groups[n.group]?.color ?? '#00ff00';
        const rgb = hexToRgb(groupColor);
        const isHovered = n.id === hovId;
        const isNeighbor = hovNeighbors?.has(n.id);
        const dimmed = hovId && !isHovered && !isNeighbor;

        // Gentle breathing
        const breathe = Math.sin(t * 1.2 + n.phase) * 0.05 + 1;
        const r = n.nodeRadius * breathe * (isHovered ? 1.25 : 1);

        // Hover glow
        if (isHovered) {
          const glow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + 22);
          glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
          glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 22, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Neighbor pulse ring
        if (isNeighbor) {
          const pulseR = r + 4 + Math.sin(t * 3) * 3;
          ctx.beginPath();
          ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // Node body
        const grad = ctx.createRadialGradient(n.x - r * 0.2, n.y - r * 0.2, 0, n.x, n.y, r);
        if (dimmed) {
          grad.addColorStop(0, 'rgba(255,255,255,0.05)');
          grad.addColorStop(1, 'rgba(255,255,255,0.01)');
        } else {
          const core = isHovered ? 0.6 : 0.3;
          const edge = isHovered ? 0.35 : 0.1;
          grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${core})`);
          grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${edge})`);
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Rim
        ctx.strokeStyle = dimmed
          ? 'rgba(255,255,255,0.03)'
          : `rgba(${rgb.r},${rgb.g},${rgb.b},${isHovered ? 0.8 : 0.3})`;
        ctx.lineWidth = isHovered ? 1.5 : 0.7;
        ctx.stroke();

        // Label
        if (!dimmed || isHovered || isNeighbor) {
          const fontSize = isHovered ? 11 : 9;
          ctx.font = `${isHovered ? '600 ' : ''}${fontSize}px ui-monospace, SFMono-Regular, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = dimmed
            ? 'rgba(255,255,255,0.06)'
            : isHovered
              ? '#fff'
              : `rgba(255,255,255,${isNeighbor ? 0.7 : 0.5})`;
          ctx.fillText(n.label, n.x, n.y + r + 3);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, dimensions]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current = { x: mx, y: my };

    const nodes = nodesRef.current;
    let found: FloatingNode | null = null;
    for (const n of nodes) {
      const dx = n.x - mx;
      const dy = n.y - my;
      if (dx * dx + dy * dy < (n.nodeRadius + 8) ** 2) {
        found = n;
        break;
      }
    }
    hoveredRef.current = found?.id ?? null;
    setHovered(found);
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
    hoveredRef.current = null;
    setHovered(null);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full aspect-[16/9] max-h-[560px] cursor-crosshair"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: hovered.x,
            top: hovered.y - hovered.nodeRadius - 38,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="px-3 py-2 bg-black/95 border border-white/10 backdrop-blur-sm text-xs font-mono rounded-md shadow-lg shadow-black/50">
            <span className="text-white font-semibold">{hovered.label}</span>
            <span className="mx-1.5 text-zinc-600">|</span>
            <span style={{ color: data.groups[hovered.group]?.color }} className="opacity-80">
              {data.groups[hovered.group]?.label}
            </span>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45 -mt-1" />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex gap-5 text-[10px] font-mono text-zinc-500">
        {Object.entries(data.groups).map(([key, g]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: g.color, boxShadow: `0 0 6px ${g.color}40` }}
            />
            {g.label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
