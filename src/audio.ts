/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural 8-bit Web Audio API Synthesizer
// Zero external audio files required!

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private currentStep: number = 0;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Melody and bass notes (frequencies in Hz)
  // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
  // C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00
  private melodyNotes: number[] = [
    523.25, 659.25, 783.99, 659.25, // C5 E5 G5 E5
    880.00, 783.99, 659.25, 523.25, // A5 G5 E5 C5
    587.33, 659.25, 587.33, 392.00, // D5 E5 D5 G4
    523.25, 587.33, 659.25, 783.99, // C5 D5 E5 G5
    880.00, 880.00, 783.99, 659.25, // A5 A5 G5 E5
    587.33, 659.25, 783.99, 880.00, // D5 E5 G5 A5
    1046.50, 783.99, 659.25, 587.33,// C6 G5 E5 D5
    523.25, 0,      523.25, 0       // C5 -  C5 -
  ];

  private bassNotes: number[] = [
    130.81, 130.81, 196.00, 196.00, // C3 C3 G3 G3
    174.61, 174.61, 130.81, 130.81, // F3 F3 C3 C3
    146.83, 146.83, 196.00, 196.00, // D3 D3 G3 G3
    130.81, 146.83, 164.81, 196.00, // C3 D3 E3 G3
    174.61, 174.61, 164.81, 164.81, // F3 F3 E3 E3
    146.83, 146.83, 196.00, 196.00, // D3 D3 G3 G3
    130.81, 196.00, 261.63, 196.00, // C3 G3 C4 G3
    130.81, 130.81, 130.81, 130.81  // C3 C3 C3 C3
  ];

  constructor() {
    // Read initial mute state from localStorage if available
    try {
      const savedMute = localStorage.getItem('cat_bread_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch {
      // ignore
    }
  }

  // Ensure AudioContext is ready on user gesture
  public initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('cat_bread_muted', String(this.isMuted));
    } catch {
      // ignore
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Start the background 8-bit chiptune loop
  public startMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.currentStep = 0;

    // 135 BPM -> ~111ms per 16th note step
    const stepDurationMs = 125;

    this.musicInterval = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || this.ctx.state !== 'running') return;
      this.playChiptuneStep();
      this.currentStep = (this.currentStep + 1) % this.melodyNotes.length;
    }, stepDurationMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  private playChiptuneStep() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const melFreq = this.melodyNotes[this.currentStep];
    const bassFreq = this.bassNotes[this.currentStep];

    // Lead melody voice (Square Wave)
    if (melFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(melFreq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.12);
    }

    // Walking bass voice (Triangle Wave)
    if (bassFreq > 0 && this.currentStep % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.14, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.24);
    }

    // Percussion Noise (Hi-hat tap on every 2nd step, snare on step 4, 12, 20, 28)
    if (this.currentStep % 2 === 0) {
      this.playRetroNoise(this.currentStep % 4 === 2 ? 'snare' : 'hihat');
    }
  }

  private playRetroNoise(type: 'hihat' | 'snare') {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * (type === 'snare' ? 0.08 : 0.03);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'snare' ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(type === 'snare' ? 1200 : 7000, now);

    const gain = this.ctx.createGain();
    const peakGain = type === 'snare' ? 0.07 : 0.025;
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'snare' ? 0.08 : 0.03));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(now);
  }

  // --- SOUND EFFECTS ---

  // Cheerful eating sound
  public playEatSound(points: number, isGolden: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (isGolden) {
      // Golden bread triumph chime
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.16);
      });
      return;
    }

    // Normal bread eating: dual pop
    const baseFreq = points >= 5 ? 783.99 : points >= 3 ? 659.25 : 523.25;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  // Hurt / Moldy bread buzz
  public playHurtSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Dropped bread miss thud
  public playMissSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Power-up collect jingle
  public playPowerUpSound(type: 'milk' | 'coffee') {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (type === 'milk') {
      // Sweet harp-like ascending twinkle
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.22, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.22);
      });
    } else {
      // Coffee turbo buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.2);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.26);
    }
  }

  // Dramatic Game Over Fanfare
  public playGameOverSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [329.63, 311.13, 293.66, 277.18, 261.63, 196.00];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      gain.gain.setValueAtTime(0.25, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.24);
    });
  }
}

export const sound = new SoundEngine();
