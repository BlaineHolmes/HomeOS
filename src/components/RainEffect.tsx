import React, { useEffect, useRef } from 'react';

interface RainDrop {
  x: number;
  y: number;
  r: number;
  speedX: number;
  speedY: number;
  momentum: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface RainEffectProps {
  isRaining: boolean;
  intensity?: 'light' | 'moderate' | 'heavy';
  className?: string;
}

const RainEffect: React.FC<RainEffectProps> = ({ 
  isRaining, 
  intensity = 'moderate',
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const dropsRef = useRef<RainDrop[]>([]);
  const lastTimeRef = useRef<number>(0);

  // Rain intensity settings
  const intensitySettings = {
    light: {
      maxDrops: 50,
      spawnRate: 0.3,
      minRadius: 1,
      maxRadius: 2,
      speed: 2,
      wind: 0.5
    },
    moderate: {
      maxDrops: 150,
      spawnRate: 0.6,
      minRadius: 1,
      maxRadius: 3,
      speed: 3,
      wind: 1
    },
    heavy: {
      maxDrops: 300,
      spawnRate: 1.2,
      minRadius: 2,
      maxRadius: 4,
      speed: 4,
      wind: 1.5
    }
  };

  const settings = intensitySettings[intensity];

  // Create a new raindrop
  const createDrop = (canvas: HTMLCanvasElement): RainDrop => {
    const maxLife = Math.random() * 100 + 50;
    return {
      x: Math.random() * (canvas.width + 200) - 100, // Start slightly off-screen
      y: -10,
      r: Math.random() * (settings.maxRadius - settings.minRadius) + settings.minRadius,
      speedX: (Math.random() - 0.5) * settings.wind,
      speedY: Math.random() * settings.speed + settings.speed,
      momentum: 1,
      opacity: Math.random() * 0.6 + 0.4,
      life: 0,
      maxLife
    };
  };

  // Update raindrop physics
  const updateDrop = (drop: RainDrop, deltaTime: number, canvas: HTMLCanvasElement): boolean => {
    drop.life += deltaTime;
    
    // Update position
    drop.x += drop.speedX * deltaTime * 0.1;
    drop.y += drop.speedY * deltaTime * 0.1;
    
    // Add slight acceleration
    drop.speedY += 0.1 * deltaTime * 0.01;
    
    // Fade out near end of life
    if (drop.life > drop.maxLife * 0.8) {
      drop.opacity *= 0.98;
    }
    
    // Remove if off-screen or life expired
    return drop.y < canvas.height + 50 && drop.life < drop.maxLife && drop.opacity > 0.01;
  };

  // Draw a raindrop with motion blur
  const drawDrop = (ctx: CanvasRenderingContext2D, drop: RainDrop) => {
    ctx.save();

    // Calculate motion blur based on speed
    const blurLength = Math.min(drop.speedY * 0.5, 10);

    // Draw motion trail
    if (blurLength > 2) {
      ctx.strokeStyle = `rgba(173, 216, 230, ${drop.opacity * 0.3})`;
      ctx.lineWidth = drop.r * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y - blurLength);
      ctx.lineTo(drop.x, drop.y);
      ctx.stroke();
    }

    // Create gradient for realistic water drop effect
    const gradient = ctx.createRadialGradient(
      drop.x - drop.r * 0.2, drop.y - drop.r * 0.3, 0,
      drop.x, drop.y, drop.r * 1.5
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${drop.opacity * 0.9})`); // Bright center
    gradient.addColorStop(0.3, `rgba(173, 216, 230, ${drop.opacity * 0.7})`); // Light blue
    gradient.addColorStop(0.7, `rgba(135, 206, 235, ${drop.opacity * 0.5})`); // Sky blue
    gradient.addColorStop(1, `rgba(70, 130, 180, ${drop.opacity * 0.2})`); // Steel blue edge

    ctx.globalAlpha = drop.opacity;
    ctx.fillStyle = gradient;

    // Draw elongated drop shape
    ctx.beginPath();
    ctx.ellipse(drop.x, drop.y, drop.r * 0.8, drop.r * 2.5, Math.PI * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Add bright highlight for realism
    ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(drop.x - drop.r * 0.3, drop.y - drop.r * 0.7, drop.r * 0.2, drop.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Animation loop
  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Clear canvas with atmospheric effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle atmospheric haze during rain
    if (isRaining && dropsRef.current.length > 20) {
      ctx.fillStyle = 'rgba(200, 220, 240, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (isRaining) {
      // Spawn new drops
      const spawnChance = settings.spawnRate * (deltaTime / 16.67); // Normalize to 60fps
      if (Math.random() < spawnChance && dropsRef.current.length < settings.maxDrops) {
        dropsRef.current.push(createDrop(canvas));
      }

      // Update and draw drops
      dropsRef.current = dropsRef.current.filter(drop => {
        const alive = updateDrop(drop, deltaTime, canvas);
        if (alive) {
          drawDrop(ctx, drop);
        }
        return alive;
      });
    } else {
      // Gradually remove drops when not raining
      dropsRef.current = dropsRef.current.filter(drop => {
        drop.opacity *= 0.95; // Fade out
        const alive = drop.opacity > 0.01;
        if (alive) {
          updateDrop(drop, deltaTime, canvas);
          drawDrop(ctx, drop);
        }
        return alive;
      });
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  // Setup canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Start animation
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRaining, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-10 ${className}`}
      style={{
        width: '100%',
        height: '100%',
        opacity: isRaining ? 1 : 0,
        transition: 'opacity 1s ease-in-out'
      }}
    />
  );
};

export default RainEffect;
