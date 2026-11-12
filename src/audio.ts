/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural 8-bit Web Audio API Synthesizer
// Supports both "Bread Shift" cozy bakery track & "Cat & Bread" arcade track
// Zero external audio files required!

export type MusicTrack = 'bakery' | 'arcade';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private currentTrack: MusicTrack = 'bakery';
  private musicInterval: number | null = null;
  private currentStep: number = 0;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Arcade chiptune melody & bass (Cat & Bread)
  private arcadeMelody: number[] = [
    523.25, 659.25, 783.99, 659.25,
    880.00, 783.99, 659.25, 523.25,
    587.33, 659.25, 587.33, 392.00,
    523.25, 587.33, 659.25, 783.99,
    880.00, 880.00, 783.99, 659.25,
    587.33, 659.25, 783.99, 880.00,
    1046.50, 783.99, 659.25, 587.33,
    523.25, 0,      523.25, 0
  ];

  private arcadeBass: number[] = [
    130.81, 130.81, 196.00, 196.00,
    174.61, 174.61, 130.81, 130.81,
    146.83, 146.83, 196.00, 196.00,
    130.81, 146.83, 164.81, 196.00,
    174.61, 174.61, 164.81, 164.81,
    146.83, 146.83, 196.00, 196.00,
    130.81, 196.00, 261.63, 196.00,
    130.81, 130.81, 130.81, 130.81
  ];

  // Calm cozy bakery waltz/lullaby (Bread Shift - warm F major / C major pastoral loop)
  private bakeryMelody: number[] = [
    392.00, 0, 523.25, 659.25, 587.33, 0,
    523.25, 0, 440.00, 392.00, 349.23, 0,
    392.00, 0, 440.00, 523.25, 493.88, 0,
    392.00, 0, 329.63, 293.66, 261.63, 0,
    523.25, 0, 659.25, 783.99, 698.46, 0,
    659.25, 0, 587.33, 523.25, 440.00, 0,
    392.00, 440.00, 523.25, 587.33, 659.25, 523.25,
    587.33, 0, 523.25, 0, 0, 0
  ];

  private bakeryBass: number[] = [
    130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
    174.61, 220.00, 261.63, 220.00, 261.63, 220.00,
    196.00, 246.94, 293.66, 246.94, 293.66, 246.94,
    130.81, 196.00, 261.63, 196.00, 164.81, 196.00,
    130.81, 196.00, 261.63, 196.00, 174.61, 220.00,
    164.81, 196.00, 261.63, 196.00, 146.83, 220.00,
    196.00, 246.94, 293.66, 196.00, 130.81, 196.00,
    130.81, 196.00, 261.63, 0, 0, 0
  ];

  constructor() {
    try {
      const savedMute = localStorage.getItem('cat_bread_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch {
      // ignore
    }
  }

  public initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
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

  public startMusic(track: MusicTrack = 'arcade') {
    this.initContext();
    if (this.isMusicPlaying && this.currentTrack === track) return;
    this.stopMusic();
    this.currentTrack = track;
    this.isMusicPlaying = true;
    this.currentStep = 0;

    const stepDurationMs = track === 'bakery' ? 220 : 125;

    this.musicInterval = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || this.ctx.state !== 'running') return;
      if (this.currentTrack === 'bakery') {
        this.playBakeryStep();
        this.currentStep = (this.currentStep + 1) % this.bakeryMelody.length;
      } else {
        this.playArcadeStep();
        this.currentStep = (this.currentStep + 1) % this.arcadeMelody.length;
      }
    }, stepDurationMs);
  }

  public startBakeryMusic() {
    this.startMusic('bakery');
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  private playBakeryStep() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const melFreq = this.bakeryMelody[this.currentStep];
    const bassFreq = this.bakeryBass[this.currentStep];

    // Gentle warm music-box triangle + soft sine voice
    if (melFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melFreq, now);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.26);
    }

    if (bassFreq > 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.08, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.21);
    }
  }

  private playArcadeStep() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const melFreq = this.arcadeMelody[this.currentStep];
    const bassFreq = this.arcadeBass[this.currentStep];

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

  // --- BREAD SHIFT BAKERY SFX ---

  public playButtonClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.04);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playSlapTicket() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Crisp paper thump + bell chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);

    // Service bell ding
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1174.66, now + 0.04);
    bellGain.gain.setValueAtTime(0.14, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    bell.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bell.start(now + 0.04);
    bell.stop(now + 0.26);
  }

  public playPlop() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playKnead(sweetSpot: boolean = true) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = sweetSpot ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(sweetSpot ? 260 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(sweetSpot ? 420 : 95, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playDing() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [880, 1318.51].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.18, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.26);
    });
  }

  public playSizzle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  public playCoin() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.15, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.2);
    });
  }

  public playServeSuccess(perfect: boolean = true) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = perfect ? [523.25, 659.25, 783.99, 1046.5] : [440, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.22, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }

  public playServeFail() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [293.66, 233.08].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.2, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.2);
    });
  }

  public playCatMeow() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(760, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.24);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  // --- CAT & BREAD ARCADE SFX ---

  public playEatSound(points: number, isGolden: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (isGolden) {
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

  public playPowerUpSound(type: 'milk' | 'coffee') {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (type === 'milk') {
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
