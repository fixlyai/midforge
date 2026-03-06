/**
 * SoundManager — Synthesized retro SFX for Midforge.
 *
 * Uses Web Audio API to generate all sounds procedurally.
 * No external audio files needed. Pixel-art-appropriate bleeps and bloops.
 *
 * Usage:
 *   SoundManager.init();           // call once after first user gesture
 *   SoundManager.play('coin');     // play a sound
 *   SoundManager.setVolume(0.5);   // master volume 0–1
 */

type SfxName =
  | 'footstep_grass' | 'footstep_stone'
  | 'sword_swing' | 'hit_impact' | 'critical_hit' | 'defeat' | 'victory_fanfare'
  | 'coin' | 'xp_chime' | 'levelup' | 'quest_accept' | 'quest_complete'
  | 'chest_open' | 'ui_click' | 'interact'
  | 'ambient_bird' | 'ambient_campfire' | 'ambient_water'
  | 'damage_tick' | 'block_shield' | 'power_charge';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let initialized = false;
let masterVol = 0.4;

function ensureCtx(): AudioContext | null {
  if (ctx && ctx.state !== 'closed') return ctx;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVol;
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

// ── Synthesis helpers ───────────────────────────────────────

function noise(c: AudioContext, duration: number, volume: number, filterFreq: number): AudioBufferSourceNode {
  const len = c.sampleRate * duration;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * volume;

  const src = c.createBufferSource();
  src.buffer = buf;

  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = filterFreq;
  src.connect(filt);

  return Object.assign(src, { _filter: filt }) as any;
}

function osc(c: AudioContext, type: OscillatorType, freq: number, duration: number): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

function env(c: AudioContext, attack: number, decay: number, sustain: number, release: number, peak = 1): GainNode {
  const g = c.createGain();
  const now = c.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.linearRampToValueAtTime(sustain * peak, now + attack + decay);
  g.gain.linearRampToValueAtTime(0, now + attack + decay + release);
  return g;
}

// ── Sound definitions ───────────────────────────────────────

const SOUNDS: Record<SfxName, (c: AudioContext, out: AudioNode) => void> = {
  footstep_grass(c, out) {
    const n = noise(c, 0.06, 0.3, 800 + Math.random() * 400);
    const g = env(c, 0.005, 0.02, 0.2, 0.03, 0.15);
    (n as any)._filter.connect(g);
    g.connect(out);
    n.start(); n.stop(c.currentTime + 0.06);
  },

  footstep_stone(c, out) {
    const n = noise(c, 0.04, 0.4, 2000 + Math.random() * 1000);
    const g = env(c, 0.002, 0.01, 0.1, 0.02, 0.12);
    (n as any)._filter.connect(g);
    g.connect(out);
    n.start(); n.stop(c.currentTime + 0.04);
  },

  sword_swing(c, out) {
    const n = noise(c, 0.15, 0.5, 3000);
    const g = env(c, 0.01, 0.05, 0.1, 0.08, 0.25);
    (n as any)._filter.connect(g);
    g.connect(out);
    n.start(); n.stop(c.currentTime + 0.15);
  },

  hit_impact(c, out) {
    const o1 = osc(c, 'square', 150, 0.1);
    const g = env(c, 0.005, 0.03, 0.3, 0.06, 0.3);
    o1.connect(g); g.connect(out);
    o1.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.1);
    o1.start(); o1.stop(c.currentTime + 0.1);

    const n = noise(c, 0.08, 0.6, 2500);
    const g2 = env(c, 0.002, 0.02, 0.1, 0.05, 0.2);
    (n as any)._filter.connect(g2); g2.connect(out);
    n.start(); n.stop(c.currentTime + 0.08);
  },

  critical_hit(c, out) {
    // Flash + bigger impact
    const o1 = osc(c, 'sawtooth', 400, 0.08);
    const g1 = env(c, 0.002, 0.02, 0.4, 0.05, 0.35);
    o1.connect(g1); g1.connect(out);
    o1.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.08);
    o1.start(); o1.stop(c.currentTime + 0.08);

    const n = noise(c, 0.12, 0.7, 4000);
    const g2 = env(c, 0.002, 0.03, 0.1, 0.08, 0.3);
    (n as any)._filter.connect(g2); g2.connect(out);
    n.start(); n.stop(c.currentTime + 0.12);

    // High ding
    const o2 = osc(c, 'sine', 880, 0.15);
    const g3 = env(c, 0.002, 0.05, 0.2, 0.1, 0.15);
    o2.connect(g3); g3.connect(out);
    o2.start(); o2.stop(c.currentTime + 0.15);
  },

  defeat(c, out) {
    const notes = [300, 250, 200, 150];
    notes.forEach((freq, i) => {
      const o = osc(c, 'square', freq, 0.2);
      const g = env(c, 0.01, 0.05, 0.5, 0.1, 0.2);
      o.connect(g); g.connect(out);
      const t = c.currentTime + i * 0.15;
      o.start(t); o.stop(t + 0.2);
    });
  },

  victory_fanfare(c, out) {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const o = osc(c, 'square', freq, 0.18);
      const g = env(c, 0.01, 0.04, 0.6, 0.08, 0.2);
      o.connect(g); g.connect(out);
      const t = c.currentTime + i * 0.12;
      o.start(t); o.stop(t + 0.18);
    });
    // Final shimmer
    const o2 = osc(c, 'sine', 1047, 0.4);
    const g2 = env(c, 0.01, 0.1, 0.3, 0.2, 0.15);
    o2.connect(g2); g2.connect(out);
    o2.start(c.currentTime + 0.48); o2.stop(c.currentTime + 0.88);
  },

  coin(c, out) {
    const o = osc(c, 'square', 987, 0.1); // B5
    const g = env(c, 0.002, 0.03, 0.3, 0.06, 0.2);
    o.connect(g); g.connect(out);
    o.start(); o.stop(c.currentTime + 0.1);

    const o2 = osc(c, 'square', 1318, 0.1); // E6
    const g2 = env(c, 0.002, 0.03, 0.3, 0.06, 0.2);
    o2.connect(g2); g2.connect(out);
    o2.start(c.currentTime + 0.08); o2.stop(c.currentTime + 0.18);
  },

  xp_chime(c, out) {
    const o = osc(c, 'sine', 660, 0.12);
    const g = env(c, 0.005, 0.03, 0.4, 0.08, 0.15);
    o.connect(g); g.connect(out);
    o.start(); o.stop(c.currentTime + 0.12);

    const o2 = osc(c, 'sine', 880, 0.12);
    const g2 = env(c, 0.005, 0.03, 0.4, 0.08, 0.15);
    o2.connect(g2); g2.connect(out);
    o2.start(c.currentTime + 0.06); o2.stop(c.currentTime + 0.18);
  },

  levelup(c, out) {
    const notes = [523, 659, 784, 1047, 1318]; // C E G C6 E6
    notes.forEach((freq, i) => {
      const o = osc(c, 'sine', freq, 0.15);
      const g = env(c, 0.01, 0.04, 0.5, 0.08, 0.25);
      o.connect(g); g.connect(out);
      const t = c.currentTime + i * 0.1;
      o.start(t); o.stop(t + 0.15);
    });
  },

  quest_accept(c, out) {
    [440, 554, 659].forEach((f, i) => {
      const o = osc(c, 'triangle', f, 0.12);
      const g = env(c, 0.005, 0.03, 0.4, 0.06, 0.18);
      o.connect(g); g.connect(out);
      const t = c.currentTime + i * 0.08;
      o.start(t); o.stop(t + 0.12);
    });
  },

  quest_complete(c, out) {
    [659, 784, 1047, 1318].forEach((f, i) => {
      const o = osc(c, 'sine', f, 0.15);
      const g = env(c, 0.01, 0.05, 0.5, 0.08, 0.22);
      o.connect(g); g.connect(out);
      const t = c.currentTime + i * 0.1;
      o.start(t); o.stop(t + 0.15);
    });
  },

  chest_open(c, out) {
    // Creak + shimmer
    const n = noise(c, 0.15, 0.3, 600);
    const g1 = env(c, 0.01, 0.05, 0.3, 0.08, 0.12);
    (n as any)._filter.connect(g1); g1.connect(out);
    n.start(); n.stop(c.currentTime + 0.15);

    [784, 988, 1175, 1318].forEach((f, i) => {
      const o = osc(c, 'sine', f, 0.12);
      const g = env(c, 0.005, 0.03, 0.3, 0.06, 0.15);
      o.connect(g); g.connect(out);
      const t = c.currentTime + 0.1 + i * 0.08;
      o.start(t); o.stop(t + 0.12);
    });
  },

  ui_click(c, out) {
    const o = osc(c, 'square', 800, 0.04);
    const g = env(c, 0.001, 0.01, 0.2, 0.02, 0.1);
    o.connect(g); g.connect(out);
    o.start(); o.stop(c.currentTime + 0.04);
  },

  interact(c, out) {
    const o = osc(c, 'triangle', 600, 0.08);
    const g = env(c, 0.005, 0.02, 0.3, 0.04, 0.15);
    o.connect(g); g.connect(out);
    o.start(); o.stop(c.currentTime + 0.08);

    const o2 = osc(c, 'triangle', 800, 0.08);
    const g2 = env(c, 0.005, 0.02, 0.3, 0.04, 0.15);
    o2.connect(g2); g2.connect(out);
    o2.start(c.currentTime + 0.05); o2.stop(c.currentTime + 0.13);
  },

  ambient_bird(c, out) {
    const freqs = [2000 + Math.random() * 800, 2400 + Math.random() * 600, 1800 + Math.random() * 400];
    freqs.forEach((f, i) => {
      const o = osc(c, 'sine', f, 0.08);
      const g = env(c, 0.005, 0.02, 0.3, 0.04, 0.06);
      o.connect(g); g.connect(out);
      o.frequency.exponentialRampToValueAtTime(f * (0.8 + Math.random() * 0.4), c.currentTime + i * 0.1 + 0.08);
      const t = c.currentTime + i * 0.1;
      o.start(t); o.stop(t + 0.08);
    });
  },

  ambient_campfire(c, out) {
    const n = noise(c, 0.3, 0.2, 400 + Math.random() * 200);
    const g = env(c, 0.05, 0.1, 0.3, 0.1, 0.05);
    (n as any)._filter.connect(g); g.connect(out);
    n.start(); n.stop(c.currentTime + 0.3);
  },

  ambient_water(c, out) {
    const n = noise(c, 0.5, 0.15, 600 + Math.random() * 300);
    const g = env(c, 0.1, 0.15, 0.4, 0.2, 0.04);
    (n as any)._filter.connect(g); g.connect(out);
    n.start(); n.stop(c.currentTime + 0.5);
  },

  damage_tick(c, out) {
    const o = osc(c, 'square', 200, 0.06);
    const g = env(c, 0.002, 0.015, 0.2, 0.03, 0.18);
    o.connect(g); g.connect(out);
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.06);
    o.start(); o.stop(c.currentTime + 0.06);
  },

  block_shield(c, out) {
    const n = noise(c, 0.08, 0.3, 5000);
    const g = env(c, 0.002, 0.02, 0.2, 0.05, 0.15);
    (n as any)._filter.connect(g); g.connect(out);
    n.start(); n.stop(c.currentTime + 0.08);

    const o = osc(c, 'sine', 500, 0.1);
    const g2 = env(c, 0.005, 0.03, 0.3, 0.05, 0.1);
    o.connect(g2); g2.connect(out);
    o.start(); o.stop(c.currentTime + 0.1);
  },

  power_charge(c, out) {
    const o = osc(c, 'sawtooth', 200, 0.25);
    const g = env(c, 0.02, 0.08, 0.5, 0.1, 0.2);
    o.connect(g); g.connect(out);
    o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.25);
    o.start(); o.stop(c.currentTime + 0.25);
  },
};

// Cooldown tracking to prevent sound spam
const lastPlayTime: Partial<Record<SfxName, number>> = {};
const COOLDOWNS: Partial<Record<SfxName, number>> = {
  footstep_grass: 80,
  footstep_stone: 80,
  ambient_bird: 5000,
  ambient_campfire: 3000,
  ambient_water: 4000,
};

// ── Public API ──────────────────────────────────────────────

export const SoundManager = {
  init() {
    if (initialized) return;
    ensureCtx();
    initialized = true;
  },

  play(name: SfxName) {
    const c = ensureCtx();
    if (!c || !masterGain) return;
    if (c.state === 'suspended') c.resume();

    const cooldown = COOLDOWNS[name] ?? 0;
    if (cooldown > 0) {
      const now = performance.now();
      const last = lastPlayTime[name] ?? 0;
      if (now - last < cooldown) return;
      lastPlayTime[name] = now;
    }

    const fn = SOUNDS[name];
    if (fn) {
      try { fn(c, masterGain); } catch { /* ignore synthesis errors */ }
    }
  },

  setVolume(v: number) {
    masterVol = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = masterVol;
  },

  getVolume() { return masterVol; },

  /** Resume AudioContext after user gesture (required by browsers) */
  resume() {
    const c = ensureCtx();
    if (c?.state === 'suspended') c.resume();
  },
};
