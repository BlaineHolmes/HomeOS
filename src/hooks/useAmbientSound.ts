import { useEffect, useRef, useState } from 'react';

interface AmbientSoundOptions {
  volume?: number;
  loop?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

interface AmbientSoundReturn {
  isPlaying: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  fadeIn: (duration?: number) => void;
  fadeOut: (duration?: number) => void;
}

/**
 * Hook for playing ambient sounds with fade in/out capabilities
 * Uses Web Audio API for better control and performance
 */
export const useAmbientSound = (
  soundUrl: string | null,
  options: AmbientSoundOptions = {}
): AmbientSoundReturn => {
  const {
    volume: initialVolume = 0.3,
    loop = true,
    fadeInDuration = 2000,
    fadeOutDuration = 2000
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);

  // Initialize audio context and nodes
  useEffect(() => {
    if (!soundUrl) return;

    // Create audio element
    const audio = new Audio(soundUrl);
    audio.loop = loop;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Create audio context and nodes
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      const sourceNode = audioContext.createMediaElementSource(audio);

      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = 0; // Start silent
      
      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
      sourceNodeRef.current = sourceNode;

      // Handle audio events
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));

    } catch (error) {
      console.warn('Web Audio API not supported, falling back to basic audio');
      // Fallback to basic audio element
      audio.volume = initialVolume;
    }

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [soundUrl, loop, initialVolume]);

  // Play audio
  const play = async () => {
    if (!audioRef.current) return;

    try {
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      await audioRef.current.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  // Pause audio
  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Stop audio
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Set volume
  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    } else if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  // Fade in
  const fadeIn = (duration = fadeInDuration) => {
    if (!gainNodeRef.current && !audioRef.current) return;

    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    if (gainNodeRef.current) {
      // Web Audio API fade
      const currentTime = audioContextRef.current!.currentTime;
      gainNodeRef.current.gain.cancelScheduledValues(currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(volume, currentTime + duration / 1000);
    } else if (audioRef.current) {
      // Fallback fade using setTimeout
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = volume / steps;
      let currentStep = 0;

      audioRef.current.volume = 0;

      const fadeStep = () => {
        if (currentStep < steps && audioRef.current) {
          currentStep++;
          audioRef.current.volume = Math.min(volume, currentStep * volumeStep);
          fadeTimeoutRef.current = setTimeout(fadeStep, stepDuration);
        }
      };

      fadeStep();
    }
  };

  // Fade out
  const fadeOut = (duration = fadeOutDuration) => {
    if (!gainNodeRef.current && !audioRef.current) return;

    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    if (gainNodeRef.current) {
      // Web Audio API fade
      const currentTime = audioContextRef.current!.currentTime;
      gainNodeRef.current.gain.cancelScheduledValues(currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);
      
      // Pause after fade completes
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }, duration);
    } else if (audioRef.current) {
      // Fallback fade using setTimeout
      const steps = 20;
      const stepDuration = duration / steps;
      const currentVolume = audioRef.current.volume;
      const volumeStep = currentVolume / steps;
      let currentStep = 0;

      const fadeStep = () => {
        if (currentStep < steps && audioRef.current) {
          currentStep++;
          audioRef.current.volume = Math.max(0, currentVolume - (currentStep * volumeStep));
          fadeTimeoutRef.current = setTimeout(fadeStep, stepDuration);
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
      };

      fadeStep();
    }
  };

  return {
    isPlaying,
    volume,
    play,
    pause,
    stop,
    setVolume,
    fadeIn,
    fadeOut
  };
};
