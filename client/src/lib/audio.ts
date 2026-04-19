/**
 * Procedural audio for the Racer game (Path 1 — no asset files).
 *
 * Every sound is synthesized live via Web Audio: oscillators, filters,
 * envelopes, noise bursts. Bundle cost is ~0 KB beyond this file.
 *
 * Design notes on the "racing, Mario-ish but bigger" brief:
 *   - Collision = satisfying CRUNCH: sub-bass thump + bandpass noise + metallic
 *     high hit. Three layers. Landing feels heavy.
 *   - Engine = constant sawtooth+triangle rumble through a lowpass, gain low.
 *     Pitch modulates with game.speed so it actually builds as you accelerate.
 *   - Life lost = descending triangle "uh-oh".
 *   - Game over = three-note triangle cascade (soft, resolved, not harsh).
 *   - Start = quick rising square chime — the "go" signal.
 *
 * Usage: call unlock() from a user gesture once, then fire play*() anywhere.
 */

const LS_MUTE_KEY = 'racer-audio-muted';

type WindowWithWebkit = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;
let _muted = false;
let _engine: {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  noise: AudioBufferSourceNode;
  lfo: OscillatorNode;
  gain: GainNode;
} | null = null;

// Restore preference on module load.
(function loadMutePref() {
  if (typeof window === 'undefined') return;
  try { _muted = localStorage.getItem(LS_MUTE_KEY) === '1'; } catch {}
})();

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const w = window as WindowWithWebkit;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return null;
    _ctx = new Ctx();
    _master = _ctx.createGain();
    _master.gain.value = _muted ? 0 : 1;
    _master.connect(_ctx.destination);
  }
  return _ctx;
}

/** Call from a user gesture (click / keypress) once per page load. */
export function unlock(): void {
  const c = ensureCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

export function isMuted(): boolean { return _muted; }

export function setMuted(m: boolean): void {
  _muted = m;
  try { localStorage.setItem(LS_MUTE_KEY, m ? '1' : '0'); } catch {}
  if (_master && _ctx) {
    _master.gain.setTargetAtTime(m ? 0 : 1, _ctx.currentTime, 0.04);
  }
}

export function toggleMuted(): boolean {
  setMuted(!_muted);
  return _muted;
}

// ============================================================================
// Helpers
// ============================================================================

function noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.max(1, Math.floor(durationSec * ctx.sampleRate));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// ============================================================================
// SFX
// ============================================================================

/**
 * Collision crunch — layered sub-thump + gritty mid-range noise + metallic hit.
 * Sounds like metal-on-metal smashing a concrete barrier. Short and punchy.
 */
export function playCollision(): void {
  const c = ensureCtx();
  if (!c || _muted || !_master) return;
  const now = c.currentTime;
  const master = _master;

  // (1) Sub-bass thump — 140Hz → 35Hz
  const thump = c.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(140, now);
  thump.frequency.exponentialRampToValueAtTime(35, now + 0.18);
  const thumpG = c.createGain();
  thumpG.gain.setValueAtTime(0, now);
  thumpG.gain.linearRampToValueAtTime(0.85, now + 0.008);
  thumpG.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  thump.connect(thumpG).connect(master);
  thump.start(now);
  thump.stop(now + 0.45);

  // (2) Bandpass crunch noise — the "crunch" layer
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 0.35);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 620;
  bp.Q.value = 2.2;
  const noiseG = c.createGain();
  noiseG.gain.setValueAtTime(0, now);
  noiseG.gain.linearRampToValueAtTime(0.38, now + 0.005);
  noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(bp).connect(noiseG).connect(master);
  noise.start(now);

  // (3) Metallic high-end hit — dissonant square chord, brief
  const hitFreqs = [880, 1320];
  hitFreqs.forEach((f) => {
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    osc.connect(lp).connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
  });
}

/**
 * Fall-off-road — distinct from a collision crunch. Long descending wail +
 * air-rushing whoosh, like the ship plunging into the void. ~0.85s total,
 * matches the ~0.7s fall timer before a life actually deducts.
 */
export function playFallOff(): void {
  const c = ensureCtx();
  if (!c || _muted || !_master) return;
  const now = c.currentTime;
  const master = _master;

  // (1) Doppler wail — triangle sliding from a distressed high down to low.
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.75);
  const oscG = c.createGain();
  oscG.gain.setValueAtTime(0, now);
  oscG.gain.linearRampToValueAtTime(0.24, now + 0.03);
  oscG.gain.setValueAtTime(0.24, now + 0.5);
  oscG.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(oscG).connect(master);
  osc.start(now);
  osc.stop(now + 0.95);

  // (2) Air-rushing whoosh — bandpass noise sliding down with the pitch, like
  // wind rushing past the falling ship. Stereo sense via a slight detune on
  // the bandpass frequency is overkill; single-channel keeps it clean.
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 0.85);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, now);
  bp.frequency.exponentialRampToValueAtTime(280, now + 0.7);
  bp.Q.value = 1.8;
  const noiseG = c.createGain();
  noiseG.gain.setValueAtTime(0, now);
  noiseG.gain.linearRampToValueAtTime(0.17, now + 0.05);
  noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  noise.connect(bp).connect(noiseG).connect(master);
  noise.start(now);
  noise.stop(now + 0.85);
}

/** Descending two-tone "uh-oh" — plays alongside collision on actual life drop. */
export function playLifeLost(): void {
  const c = ensureCtx();
  if (!c || _muted || !_master) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(640, now);
  osc.frequency.setValueAtTime(470, now + 0.14);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.42);
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.22, now + 0.02);
  g.gain.setValueAtTime(0.22, now + 0.38);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
  osc.connect(g).connect(_master);
  osc.start(now);
  osc.stop(now + 0.55);
}

/** Three-note descending resolution. Soft triangle, slightly melancholic. */
export function playGameOver(): void {
  const c = ensureCtx();
  if (!c || _muted || !_master) return;
  const now = c.currentTime;

  const notes = [523, 392, 261]; // C5 → G4 → C4
  notes.forEach((f, i) => {
    const t = now + i * 0.28;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    // Slight detuned partial for body
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = f * 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g);
    osc2.connect(g);
    g.connect(_master!);
    osc.start(t); osc.stop(t + 0.45);
    osc2.start(t); osc2.stop(t + 0.45);
  });
}

/** Quick rising chime — the "GO" at start of a run. */
export function playStart(): void {
  const c = ensureCtx();
  if (!c || _muted || !_master) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(820, now + 0.14);
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.18, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  osc.connect(lp).connect(g).connect(_master);
  osc.start(now);
  osc.stop(now + 0.25);
}

// ============================================================================
// Engine — continuous rumble layer during gameplay, pitch-tracks speed
// ============================================================================

export function startEngine(): void {
  const c = ensureCtx();
  if (!c || !_master || _engine) return;
  const now = c.currentTime;

  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.11, now + 0.35);

  // Bandpass around the mid-range — gives the combustion "buzz" rather than a
  // turbine-y low drone. Q kept below 1 so it stays broad/natural.
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 650;
  bp.Q.value = 0.9;

  // Two detuned sawtooths — the few-Hz beat frequency between them creates
  // organic grit ("grrr" texture) instead of a sterile steady tone.
  const osc1 = c.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = 128;

  const osc2 = c.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = 131; // ~3 Hz beat with osc1

  // Octave-up square wave — aggressive odd-harmonic "snarl" that screams race
  // car rather than generator. Gated down so it sits under the sawtooths.
  const osc3 = c.createOscillator();
  osc3.type = 'square';
  osc3.frequency.value = 256;
  const osc3G = c.createGain();
  osc3G.gain.value = 0.32;

  // Road/air texture — bandpassed noise sitting in the same mid-band as the
  // fundamentals; reads as tyre hiss + wind.
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 1.5);
  noise.loop = true;
  const noiseBP = c.createBiquadFilter();
  noiseBP.type = 'bandpass';
  noiseBP.frequency.value = 700;
  noiseBP.Q.value = 0.55;
  const noiseG = c.createGain();
  noiseG.gain.value = 0.11;

  // Cylinder-firing simulation — low-freq sine modulates the master engine
  // gain, creating the pulsing "BRRR-BRRR" character of a combustion engine.
  // Connects directly into the gain AudioParam so it's additive.
  // Baseline 9Hz (not 5) so idle already feels alert + punchy, scales up
  // with speed. Depth halved so the peaks/troughs stay smooth rather than
  // swinging dramatically.
  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 9;
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.032;
  lfo.connect(lfoDepth).connect(gain.gain);

  // Routing
  osc1.connect(bp);
  osc2.connect(bp);
  osc3.connect(osc3G).connect(bp);
  bp.connect(gain);
  noise.connect(noiseBP).connect(noiseG).connect(gain);
  gain.connect(_master);

  osc1.start(); osc2.start(); osc3.start(); noise.start(); lfo.start();
  _engine = { osc1, osc2, osc3, noise, lfo, gain };
}

export function stopEngine(): void {
  if (!_engine || !_ctx) return;
  const now = _ctx.currentTime;
  _engine.gain.gain.cancelScheduledValues(now);
  _engine.gain.gain.setValueAtTime(_engine.gain.gain.value, now);
  _engine.gain.gain.linearRampToValueAtTime(0, now + 0.25);
  const eng = _engine;
  setTimeout(() => {
    try {
      eng.osc1.stop(); eng.osc2.stop(); eng.osc3.stop();
      eng.noise.stop(); eng.lfo.stop();
    } catch {}
  }, 350);
  _engine = null;
}

/**
 * speedFactor: 1.0 = normal, ~2.6 at max game speed.
 * Scales all three engine oscillators AND the cylinder-firing LFO — higher
 * speed = brighter engine + faster firing rate, like a real rev.
 */
export function setEnginePitch(speedFactor: number): void {
  if (!_engine || !_ctx) return;
  const t = _ctx.currentTime;
  const base1 = 128, base2 = 131, base3 = 256;
  const mult = 1 + (speedFactor - 1) * 0.55;
  _engine.osc1.frequency.setTargetAtTime(base1 * mult, t, 0.1);
  _engine.osc2.frequency.setTargetAtTime(base2 * mult, t, 0.1);
  _engine.osc3.frequency.setTargetAtTime(base3 * mult, t, 0.1);
  // LFO rate also speeds up — "cylinders firing faster" at higher revs.
  _engine.lfo.frequency.setTargetAtTime(9 * mult, t, 0.1);
}
