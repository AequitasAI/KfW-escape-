import { loadMuted, saveMuted } from './identity.js';

export type SoundName =
  | 'click'
  | 'clunk'
  | 'rune'
  | 'stamp'
  | 'machine'
  | 'gate'
  | 'seal'
  | 'finale'
  | 'fail';

/**
 * Sound architecture without any audio assets: short synthesised cues via
 * WebAudio. That keeps the repository free of binary files while leaving a
 * single seam - swap `play()` for a sample player and everything else stays.
 *
 * The context is created lazily on the first user gesture, so nothing ever
 * autoplays before an interaction.
 */

interface Cue {
  type: OscillatorType;
  /** [startHz, endHz] */
  sweep: [number, number];
  durationMs: number;
  gain: number;
  /** optional second voice for a fuller sound */
  harmonic?: number;
}

const CUES: Record<SoundName, Cue> = {
  click: { type: 'triangle', sweep: [520, 480], durationMs: 55, gain: 0.05 },
  clunk: { type: 'square', sweep: [180, 90], durationMs: 130, gain: 0.07 },
  rune: { type: 'sine', sweep: [640, 1180], durationMs: 260, gain: 0.06, harmonic: 1.5 },
  stamp: { type: 'square', sweep: [240, 60], durationMs: 180, gain: 0.08 },
  machine: { type: 'sawtooth', sweep: [90, 260], durationMs: 900, gain: 0.05, harmonic: 2 },
  gate: { type: 'sawtooth', sweep: [70, 150], durationMs: 1200, gain: 0.05 },
  seal: { type: 'sine', sweep: [520, 940], durationMs: 520, gain: 0.06, harmonic: 1.5 },
  finale: { type: 'sine', sweep: [330, 990], durationMs: 1600, gain: 0.07, harmonic: 1.5 },
  fail: { type: 'sine', sweep: [320, 120], durationMs: 900, gain: 0.06 },
};

class SoundEngine {
  private context: AudioContext | null = null;
  private muted = loadMuted();
  private readonly listeners = new Set<(muted: boolean) => void>();

  get isMuted(): boolean {
    return this.muted;
  }

  subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
    for (const listener of this.listeners) listener(muted);
  }

  toggle(): void {
    this.setMuted(!this.muted);
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.context = new Ctor();
      return this.context;
    } catch {
      return null;
    }
  }

  play(name: SoundName): void {
    if (this.muted) return;
    const context = this.ensureContext();
    if (!context) return;

    const cue = CUES[name];
    const now = context.currentTime;
    const duration = cue.durationMs / 1000;

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(cue.gain, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(context.destination);

    const voices = cue.harmonic ? [1, cue.harmonic] : [1];
    for (const multiplier of voices) {
      const osc = context.createOscillator();
      osc.type = cue.type;
      osc.frequency.setValueAtTime(cue.sweep[0] * multiplier, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, cue.sweep[1] * multiplier), now + duration);
      const voiceGain = context.createGain();
      voiceGain.gain.value = multiplier === 1 ? 1 : 0.4;
      osc.connect(voiceGain).connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  }
}

export const sound = new SoundEngine();
