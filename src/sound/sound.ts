// Web Audio synthesized sounds. No asset files. Each sound is a tiny
// oscillator + envelope. Quiet, short, non-annoying.

type SoundName = 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'gameEnd' | 'illegal';

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

interface Tone {
  freq: number;
  decay: number;
  type?: OscillatorType;
  gain?: number;
  offset?: number; // start delay in seconds for layered tones
}

const SOUND_DEFS: Record<SoundName, Tone[]> = {
  move:    [{ freq: 320, decay: 0.08, gain: 0.18 }],
  capture: [{ freq: 220, decay: 0.10, gain: 0.22, type: 'triangle' }, { freq: 110, decay: 0.12, gain: 0.18 }],
  check:   [{ freq: 660, decay: 0.10, gain: 0.18 }, { freq: 880, decay: 0.10, gain: 0.18, offset: 0.06 }],
  castle:  [{ freq: 320, decay: 0.08, gain: 0.16 }, { freq: 420, decay: 0.10, gain: 0.16, offset: 0.07 }],
  promote: [{ freq: 520, decay: 0.10, gain: 0.18 }, { freq: 660, decay: 0.10, gain: 0.18, offset: 0.06 }, { freq: 880, decay: 0.14, gain: 0.18, offset: 0.12 }],
  gameEnd: [{ freq: 440, decay: 0.18, gain: 0.20 }, { freq: 330, decay: 0.18, gain: 0.20, offset: 0.10 }, { freq: 220, decay: 0.24, gain: 0.20, offset: 0.22 }],
  illegal: [{ freq: 180, decay: 0.10, gain: 0.18, type: 'square' }],
};

function playTone(t: Tone): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime + (t.offset ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = t.type ?? 'sine';
  osc.frequency.setValueAtTime(t.freq, now);
  const peak = t.gain ?? 0.2;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + t.decay);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + t.decay + 0.02);
}

export function play(name: SoundName): void {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  // AudioContext starts suspended on iOS until a user gesture.
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  for (const tone of SOUND_DEFS[name]) playTone(tone);
}

// Best-effort: kick the AudioContext alive on first user interaction.
export function primeOnInteraction(): void {
  const handler = () => {
    const c = getCtx();
    if (c?.state === 'suspended') c.resume().catch(() => {});
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
}
