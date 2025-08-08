/**
 * Rain Sound Generator using Web Audio API
 * Creates realistic rain sounds procedurally without audio files
 */

interface RainSoundOptions {
  intensity: 'light' | 'moderate' | 'heavy';
  volume: number;
}

export class RainSoundGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private rainNodes: AudioBufferSourceNode[] = [];
  private thunderTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0;
    } catch (error) {
      console.warn('Web Audio API not supported');
    }
  }

  /**
   * Generate white noise buffer for rain base sound
   */
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        // Generate pink noise (more natural than white noise)
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(Math.random(), 0.5);
      }
    }

    return buffer;
  }

  /**
   * Create filtered noise for rain sound
   */
  private createRainSound(intensity: 'light' | 'moderate' | 'heavy'): AudioBufferSourceNode | null {
    if (!this.audioContext || !this.masterGain) return null;

    // Create noise buffer
    const noiseBuffer = this.createNoiseBuffer(10); // 10 second loop
    if (!noiseBuffer) return null;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Create filter chain for realistic rain sound
    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = intensity === 'light' ? 1000 : intensity === 'moderate' ? 800 : 600;

    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = intensity === 'light' ? 4000 : intensity === 'moderate' ? 6000 : 8000;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = intensity === 'light' ? 2000 : intensity === 'moderate' ? 3000 : 4000;
    bandpass.Q.value = 0.5;

    // Create gain for this rain layer
    const rainGain = this.audioContext.createGain();
    const baseVolume = intensity === 'light' ? 0.1 : intensity === 'moderate' ? 0.2 : 0.3;
    rainGain.gain.value = baseVolume;

    // Connect the chain
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(rainGain);
    rainGain.connect(this.masterGain);

    return source;
  }

  /**
   * Create individual raindrop sounds
   */
  private createDropletSounds(intensity: 'light' | 'moderate' | 'heavy') {
    if (!this.audioContext || !this.masterGain) return;

    const dropRate = intensity === 'light' ? 100 : intensity === 'moderate' ? 50 : 25; // ms between drops
    const dropVolume = intensity === 'light' ? 0.05 : intensity === 'moderate' ? 0.08 : 0.12;

    const scheduleDroplet = () => {
      if (!this.isPlaying) return;

      // Create a short burst of filtered noise for droplet
      const oscillator = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      // Random frequency for variation
      oscillator.frequency.value = 2000 + Math.random() * 3000;
      oscillator.type = 'sawtooth';

      filter.type = 'lowpass';
      filter.frequency.value = 1000 + Math.random() * 2000;

      // Quick envelope
      gain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gain.gain.linearRampToValueAtTime(dropVolume, this.audioContext!.currentTime + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 0.05);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start();
      oscillator.stop(this.audioContext!.currentTime + 0.05);

      // Schedule next droplet
      setTimeout(scheduleDroplet, dropRate + Math.random() * dropRate);
    };

    scheduleDroplet();
  }

  /**
   * Create thunder sound for storms
   */
  createThunder() {
    if (!this.audioContext || !this.masterGain) return;

    const thunderGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const delay = this.audioContext.createDelay(1.0);
    const delayGain = this.audioContext.createGain();

    // Create thunder using multiple oscillators with different frequencies
    const oscillators = [];
    const frequencies = [40, 60, 80, 120, 200, 300];

    for (const freq of frequencies) {
      const osc = this.audioContext.createOscillator();
      const oscGain = this.audioContext.createGain();

      osc.frequency.value = freq + (Math.random() - 0.5) * 20; // Add slight variation
      osc.type = 'sawtooth';

      // Thunder envelope - quick attack, long decay
      const attackTime = 0.05 + Math.random() * 0.05;
      const decayTime = 1.5 + Math.random() * 1.0;
      const volume = 0.2 + Math.random() * 0.2;

      oscGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      oscGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + attackTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decayTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      oscillators.push(osc);
    }

    // Add some noise for realism
    const noiseBuffer = this.createNoiseBuffer(3);
    if (noiseBuffer) {
      const noiseSource = this.audioContext.createBufferSource();
      const noiseGain = this.audioContext.createGain();
      const noiseFilter = this.audioContext.createBiquadFilter();

      noiseSource.buffer = noiseBuffer;
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 200;

      noiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 2);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(filter);

      noiseSource.start();
      noiseSource.stop(this.audioContext.currentTime + 3);
    }

    // Setup filter and delay for echo effect
    filter.type = 'lowpass';
    filter.frequency.value = 400 + Math.random() * 200;

    delay.delayTime.value = 0.3;
    delayGain.gain.value = 0.3;

    filter.connect(thunderGain);
    filter.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(thunderGain);

    thunderGain.connect(this.masterGain);
    thunderGain.gain.value = 0.6;

    // Start all oscillators
    oscillators.forEach(osc => {
      osc.start();
      osc.stop(this.audioContext!.currentTime + 3);
    });
  }

  /**
   * Start playing rain sounds
   */
  async start(options: RainSoundOptions) {
    if (!this.audioContext || this.isPlaying) return;

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isPlaying = true;

      // Create main rain sound layers
      for (let i = 0; i < 3; i++) {
        const rainSource = this.createRainSound(options.intensity);
        if (rainSource) {
          this.rainNodes.push(rainSource);
          rainSource.start();
        }
      }

      // Add droplet sounds
      this.createDropletSounds(options.intensity);

      // Add occasional thunder for heavy rain
      if (options.intensity === 'heavy') {
        const scheduleThunder = () => {
          if (!this.isPlaying) return;
          
          this.createThunder();
          
          // Schedule next thunder (random interval)
          this.thunderTimeout = setTimeout(scheduleThunder, 10000 + Math.random() * 20000);
        };
        
        // First thunder after 5-15 seconds
        this.thunderTimeout = setTimeout(scheduleThunder, 5000 + Math.random() * 10000);
      }

      // Fade in
      this.setVolume(options.volume);

    } catch (error) {
      console.error('Failed to start rain sounds:', error);
    }
  }

  /**
   * Stop playing rain sounds
   */
  stop() {
    this.isPlaying = false;

    // Clear thunder timeout
    if (this.thunderTimeout) {
      clearTimeout(this.thunderTimeout);
      this.thunderTimeout = null;
    }

    // Stop all rain nodes
    this.rainNodes.forEach(node => {
      try {
        node.stop();
      } catch (error) {
        // Node might already be stopped
      }
    });
    this.rainNodes = [];

    // Fade out master gain
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number) {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext.currentTime + 0.1
      );
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
