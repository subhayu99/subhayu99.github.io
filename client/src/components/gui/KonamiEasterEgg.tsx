import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleSandbox from './ParticleSandbox';

interface KonamiEasterEggProps {
  active: boolean;
  onClose: () => void;
}

type Phase = 'idle' | 'glitching' | 'scanning' | 'dossier' | 'purging' | 'sandbox';

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789@#$%&¥∆§£€¢░▒▓█'.split('');
function randomGlyph() { return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }

// ── Scan data collection ──

interface ScanData {
  browser: string;
  os: string;
  screen: string;
  cores?: string;
  ram?: string;
  network?: string;
  timezone: string;
  language: string;
  theme: string;
  visitTime: string;
}

function parseUA(): { browser: string; os: string } {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Firefox/')) browser = `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0]}`;
  else if (ua.includes('Edg/')) browser = `Edge ${ua.split('Edg/')[1]?.split(' ')[0]}`;
  else if (ua.includes('Chrome/')) browser = `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0]}`;
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = `Safari ${ua.split('Version/')[1]?.split(' ')[0] || ''}`;

  if (ua.includes('Mac OS X')) os = `macOS ${ua.split('Mac OS X ')[1]?.split(')')[0]?.replace(/_/g, '.') || ''}`;
  else if (ua.includes('Windows NT')) os = `Windows ${ua.includes('Windows NT 10') ? '10/11' : ua.split('Windows NT ')[1]?.split(';')[0]}`;
  else if (ua.includes('Android')) os = `Android ${ua.split('Android ')[1]?.split(';')[0]}`;
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = `iOS ${ua.split('OS ')[1]?.split(' ')[0]?.replace(/_/g, '.') || ''}`;
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser: browser.trim(), os: os.trim() };
}

function collectScanData(): ScanData {
  const { browser, os } = parseUA();
  const data: ScanData = {
    browser,
    os,
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  // Hardware
  if (navigator.hardwareConcurrency) data.cores = String(navigator.hardwareConcurrency);
  if ((navigator as any).deviceMemory) data.ram = `${(navigator as any).deviceMemory}GB`;

  // Network
  const conn = (navigator as any).connection;
  if (conn?.effectiveType) data.network = conn.effectiveType;

  return data;
}

// ── Component ──

export default function KonamiEasterEgg({ active, onClose }: KonamiEasterEggProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [scanLines, setScanLines] = useState<string[]>([]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [gravityOn, setGravityOn] = useState(false);
  const [explodeTrigger, setExplodeTrigger] = useState(0);
  const [purgeProgress, setPurgeProgress] = useState(0);
  const scanRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const subjectId = useRef(Math.floor(100000 + Math.random() * 900000));

  const close = useCallback(() => {
    setPhase('idle');
    setScanLines([]);
    setScanData(null);
    setGravityOn(false);
    setPurgeProgress(0);
    cancelRef.current = true;
    // Restore page
    const main = document.querySelector('[data-gui-portfolio]') as HTMLElement | null;
    if (main) {
      main.style.filter = '';
      main.style.opacity = '';
    }
    onClose();
  }, [onClose]);

  // Global ESC key
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, close]);

  // ── Phase: Glitch ──
  useEffect(() => {
    if (!active || phase !== 'idle') return;

    cancelRef.current = false;
    setPhase('glitching');
    subjectId.current = Math.floor(100000 + Math.random() * 900000);

    const main = document.querySelector('[data-gui-portfolio]') as HTMLElement | null;
    if (!main) { setPhase('scanning'); return; }

    // Flicker
    let step = 0;
    const flickerInterval = setInterval(() => {
      if (cancelRef.current) { clearInterval(flickerInterval); return; }
      main.style.opacity = step % 2 === 0 ? '0' : '1';
      step++;
      if (step > 6) {
        clearInterval(flickerInterval);
        main.style.opacity = '1';
        // RGB split + scan lines
        main.style.filter = 'hue-rotate(90deg) saturate(3) contrast(1.5)';
        main.style.transition = 'filter 0.3s';
      }
    }, 50);

    // Hard cut after 1.2s
    const cutTimer = setTimeout(() => {
      if (cancelRef.current) return;
      if (main) {
        main.style.filter = '';
        main.style.transition = '';
        main.style.opacity = '0';
      }
      setPhase('scanning');
    }, 1200);

    return () => {
      clearInterval(flickerInterval);
      clearTimeout(cutTimer);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase: Scan ──
  // Start typing immediately, fetch IP in parallel
  useEffect(() => {
    if (phase !== 'scanning') return;

    let cancelled = false;
    cancelRef.current = false;

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    async function typeLine(displayed: string[], text: string) {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled || cancelRef.current) return;
        const partial = text.slice(0, i) + (i < text.length ? '█' : '');
        setScanLines([...displayed, partial]);
        await wait(20);
      }
      displayed.push(text);
      setScanLines([...displayed]);
    }

    function pushEmpty(displayed: string[]) {
      displayed.push('');
      setScanLines([...displayed]);
    }

    function scrollDown() {
      if (scanRef.current) scanRef.current.scrollTop = scanRef.current.scrollHeight;
    }

    (async () => {
      const data = collectScanData();
      setScanData(data);
      const displayed: string[] = [];

      await wait(50);
      if (cancelled) return;
      await typeLine(displayed, '> INITIALIZING BREACH PROTOCOL...');
      scrollDown();
      await wait(400);
      if (cancelled) return;
      await typeLine(displayed, '> SCANNING TARGET...');
      scrollDown();
      await wait(300);
      pushEmpty(displayed);
      if (cancelled) return;

      await typeLine(displayed, '> PROFILING DEVICE...'); scrollDown(); await wait(300);
      pushEmpty(displayed);
      if (cancelled) return;

      await typeLine(displayed, `  BROWSER:       ${data.browser} · ${data.os}`); scrollDown(); await wait(100);
      await typeLine(displayed, `  SCREEN:        ${data.screen}`); scrollDown(); await wait(100);
      if (data.cores) { await typeLine(displayed, `  CORES:         ${data.cores}${data.ram ? ` · RAM: ${data.ram}` : ''}`); scrollDown(); await wait(100); }
      if (data.network) { await typeLine(displayed, `  NETWORK:       ${data.network}`); scrollDown(); await wait(100); }
      if (cancelled) return;

      pushEmpty(displayed); await wait(300);
      await typeLine(displayed, '> ANALYZING BEHAVIOR...'); scrollDown(); await wait(300);
      pushEmpty(displayed);
      if (cancelled) return;

      await typeLine(displayed, `  TIMEZONE:      ${data.timezone}`); scrollDown(); await wait(100);
      await typeLine(displayed, `  LANGUAGE:      ${data.language}`); scrollDown(); await wait(100);
      await typeLine(displayed, `  THEME PREF:    ${data.theme}`); scrollDown(); await wait(100);
      await typeLine(displayed, `  VISIT TIME:    ${data.visitTime}`); scrollDown(); await wait(100);
      if (cancelled) return;

      pushEmpty(displayed); await wait(500);
      await typeLine(displayed, '> BREACH COMPLETE.'); scrollDown(); await wait(300);
      await typeLine(displayed, '> CLASSIFICATION: ██████████ TOP SECRET'); scrollDown();

      await wait(1000);
      if (!cancelled && !cancelRef.current) {
        setPhase('dossier');
      }
    })();

    return () => { cancelled = true; };
  }, [phase]);

  // ── Purge exit ──
  const purge = useCallback(() => {
    setPhase('purging');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setPurgeProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => close(), 200);
      }
    }, 12);
  }, [close]);

  const navigateToSection = useCallback((sectionId: string) => {
    close();
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [close]);

  const openSandbox = useCallback(() => {
    setPhase('sandbox');
  }, []);

  if (!active && phase === 'idle') return null;

  return (
    <AnimatePresence>
      {(active || phase !== 'idle') && (
        <motion.div
          className={`fixed inset-0 z-[100] ${phase === 'glitching' ? 'bg-transparent' : 'bg-black'}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* CRT scan lines overlay — hidden during glitch */}
          {phase !== 'glitching' && (
            <div
              className="absolute inset-0 pointer-events-none z-50"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
              }}
            />
          )}

          {/* ── Scanning phase ── */}
          {phase === 'scanning' && (
            <motion.div
              ref={scanRef}
              className="absolute inset-0 overflow-y-auto p-6 sm:p-10 font-mono text-sm sm:text-base text-green-400"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
            >
              {scanLines.map((line, i) => (
                <div key={i} className={`leading-7 ${line.startsWith('>') ? 'text-green-300 font-bold' : 'text-green-500/80'}`}>
                  {line || '\u00A0'}
                </div>
              ))}
            </motion.div>
          )}

          {/* ── Dossier phase ── */}
          {phase === 'dossier' && scanData && (
            <motion.div
              className="absolute inset-0 overflow-y-auto flex items-start justify-center p-4 sm:p-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-full max-w-2xl border border-green-500/30 bg-black/95 font-mono text-sm">
                {/* Header */}
                <div className="border-b border-green-500/30 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-bold tracking-wider">██ CLASSIFIED ██</span>
                    <span className="text-green-500/50 text-xs">LEVEL 5 CLEARANCE</span>
                  </div>
                  <p className="text-green-500/40 text-xs mt-1">DOSSIER: SUBJECT #{subjectId.current}</p>
                </div>

                {/* Subject Profile */}
                <div className="border-b border-dashed border-green-500/20 px-6 py-5">
                  <h3 className="text-green-400/60 text-xs tracking-widest mb-3">SUBJECT PROFILE</h3>
                  <div className="space-y-1.5 text-green-500/70">
                    <div>Device:    <span className="text-green-400">{scanData.browser} · {scanData.os}</span></div>
                    <div>Screen:    <span className="text-green-400">{scanData.screen}</span></div>
                    {scanData.cores && <div>Cores:     <span className="text-green-400">{scanData.cores}{scanData.ram ? ` · RAM: ${scanData.ram}` : ''}</span></div>}
                    {scanData.network && <div>Network:   <span className="text-green-400">{scanData.network}</span></div>}
                  </div>
                  <div className="mt-4 flex gap-8 text-xs">
                    <div>
                      <span className="text-green-500/40">THREAT ASSESSMENT: </span>
                      <span className="text-green-400">LOW</span>
                    </div>
                    <div>
                      <span className="text-green-500/40">ACCESS LEVEL: </span>
                      <span className="text-green-400 font-bold">GRANTED</span>
                    </div>
                  </div>
                </div>

                {/* Handler */}
                <div className="border-b border-dashed border-green-500/20 px-6 py-4">
                  <h3 className="text-green-400/60 text-xs tracking-widest mb-2">HANDLER</h3>
                  <div className="text-green-500/70 space-y-1">
                    <div>Name:      <span className="text-green-400 font-bold">Subhayu Kumar Bala</span></div>
                    <div>Status:    <span className="text-green-400">Data & Infrastructure Engineer</span></div>
                    <div>Sector:    <span className="text-green-400">Loop AI</span></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-b border-green-500/30 px-6 py-5">
                  <h3 className="text-green-400/60 text-xs tracking-widest mb-3">CLASSIFIED OPERATIONS</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigateToSection('projects')}
                      className="block w-full text-left px-3 py-2 text-green-400 border border-green-500/20
                                 hover:bg-green-500/10 hover:border-green-500/40 transition-all text-xs"
                    >
                      ► View classified projects
                    </button>
                    <button
                      onClick={openSandbox}
                      className="block w-full text-left px-3 py-2 text-green-400 border border-green-500/20
                                 hover:bg-green-500/10 hover:border-green-500/40 transition-all text-xs"
                    >
                      ► Access particle sandbox
                    </button>
                    <button
                      onClick={() => { close(); window.location.hash = '#terminal'; }}
                      className="block w-full text-left px-3 py-2 text-green-400 border border-green-500/20
                                 hover:bg-green-500/10 hover:border-green-500/40 transition-all text-xs"
                    >
                      ► Open secure terminal
                    </button>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="px-6 py-4 flex gap-3">
                  <button
                    onClick={purge}
                    className="flex-1 px-4 py-2.5 border-2 border-red-500/60 text-red-400 font-mono text-xs
                               hover:bg-red-500/20 hover:border-red-400 transition-all"
                  >
                    PURGE DATA
                  </button>
                  <button
                    onClick={close}
                    className="flex-1 px-4 py-2.5 border border-white/20 text-zinc-400 font-mono text-xs
                               hover:border-green-500/40 hover:text-green-400 transition-all"
                  >
                    DISMISS [ESC]
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Sandbox phase ── */}
          {phase === 'sandbox' && (
            <motion.div
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between px-4 py-3 font-mono text-xs border-b border-green-500/20">
                <span className="text-green-400">PARTICLE SANDBOX</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGravityOn(g => !g)}
                    className={`px-3 py-1 border text-xs transition-colors ${
                      gravityOn
                        ? 'border-green-500/60 text-green-400 bg-green-500/10'
                        : 'border-white/20 text-zinc-400 hover:border-green-500/40'
                    }`}
                  >
                    {gravityOn ? 'GRAVITY ON' : 'GRAVITY OFF'}
                  </button>
                  <button
                    onClick={() => setExplodeTrigger(n => n + 1)}
                    className="px-3 py-1 border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors text-xs"
                  >
                    EXPLODE
                  </button>
                  <button
                    onClick={() => setPhase('dossier')}
                    className="px-3 py-1 border border-white/20 text-zinc-400 hover:text-green-400 transition-colors text-xs"
                  >
                    BACK
                  </button>
                </div>
              </div>
              <div className="flex-1 relative">
                <ParticleSandbox gravityOn={gravityOn} explodeTrigger={explodeTrigger} />
                <p className="absolute bottom-3 left-0 right-0 text-center text-green-500/30 text-xs font-mono pointer-events-none">
                  TAP TO ATTRACT · RELEASE TO REPULSE
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Purge overlay ── */}
          {phase === 'purging' && (
            <>
              {/* Red flash */}
              <motion.div
                className="absolute inset-0 bg-red-500 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.3 }}
              />
              {/* Wipe bar */}
              <div
                className="absolute top-0 left-0 right-0 bg-black z-40"
                style={{ height: `${purgeProgress}%`, transition: 'height 12ms linear' }}
              />
              {/* Scrambled text underneath */}
              <div className="absolute inset-0 p-6 font-mono text-sm text-green-400/30 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="leading-6">
                    {Array.from({ length: 50 }).map((_, j) => randomGlyph()).join('')}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Glitching phase — mostly transparent, page glitch does the work */}
          {phase === 'glitching' && (
            <div className="absolute inset-0 bg-transparent" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
