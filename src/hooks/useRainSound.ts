import { useEffect, useRef, useState } from 'react';
import { RainSoundGenerator } from '../utils/rainSoundGenerator';

interface UseRainSoundOptions {
  enabled?: boolean;
  intensity?: 'light' | 'moderate' | 'heavy';
  volume?: number;
  autoPlay?: boolean;
}

interface UseRainSoundReturn {
  isPlaying: boolean;
  volume: number;
  play: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  setIntensity: (intensity: 'light' | 'moderate' | 'heavy') => void;
  triggerThunder: () => void;
}

/**
 * Hook for playing procedurally generated rain sounds
 */
export const useRainSound = (options: UseRainSoundOptions = {}): UseRainSoundReturn => {
  const {
    enabled = true,
    intensity: initialIntensity = 'moderate',
    volume: initialVolume = 0.3,
    autoPlay = false
  } = options;

  const generatorRef = useRef<RainSoundGenerator | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [intensity, setIntensityState] = useState(initialIntensity);

  // Initialize rain sound generator
  useEffect(() => {
    if (!enabled) return;

    generatorRef.current = new RainSoundGenerator();

    return () => {
      if (generatorRef.current) {
        generatorRef.current.destroy();
        generatorRef.current = null;
      }
    };
  }, [enabled]);

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && enabled && generatorRef.current && !isPlaying) {
      play();
    }
  }, [autoPlay, enabled]);

  // Play rain sounds
  const play = async () => {
    if (!generatorRef.current || isPlaying) return;

    try {
      await generatorRef.current.start({
        intensity,
        volume
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play rain sounds:', error);
    }
  };

  // Stop rain sounds
  const stop = () => {
    if (!generatorRef.current || !isPlaying) return;

    generatorRef.current.stop();
    setIsPlaying(false);
  };

  // Set volume
  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (generatorRef.current) {
      generatorRef.current.setVolume(clampedVolume);
    }
  };

  // Set intensity (requires restart)
  const setIntensity = (newIntensity: 'light' | 'moderate' | 'heavy') => {
    setIntensityState(newIntensity);

    if (isPlaying && generatorRef.current) {
      // Restart with new intensity
      generatorRef.current.stop();
      setTimeout(async () => {
        if (generatorRef.current) {
          await generatorRef.current.start({
            intensity: newIntensity,
            volume
          });
        }
      }, 500);
    }
  };

  // Trigger thunder sound
  const triggerThunder = () => {
    if (generatorRef.current) {
      generatorRef.current.createThunder();
    }
  };

  return {
    isPlaying,
    volume,
    play,
    stop,
    setVolume,
    setIntensity,
    triggerThunder
  };
};
