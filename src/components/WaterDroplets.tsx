import React, { useEffect, useRef } from 'react';

interface Droplet {
  x: number;
  y: number;
  r: number;
  opacity: number;
  life: number;
  maxLife: number;
  rippleRadius: number;
  rippleOpacity: number;
}

interface WaterDropletsProps {
  isActive: boolean;
  intensity?: number;
  className?: string;
}

const WaterDroplets: React.FC<WaterDropletsProps> = ({ 
  isActive, 
  intensity = 0.5,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const dropletsRef = useRef<Droplet[]>([]);
  const lastTimeRef = useRef<number>(0);

  // Create a new water droplet
  const createDroplet = (canvas: HTMLCanvasElement): Droplet => {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      life: 0,
      maxLife: Math.random() * 3000 + 2000, // 2-5 seconds
      rippleRadius: 0,
      rippleOpacity: 0
    };
  };

  // Update droplet
  const updateDroplet = (droplet: Droplet, deltaTime: number): boolean => {
    droplet.life += deltaTime;
    
    // Droplet lifecycle
    const lifeRatio = droplet.life / droplet.maxLife;
    
    if (lifeRatio < 0.1) {
      // Fade in
      droplet.opacity = (lifeRatio / 0.1) * 0.8;
    } else if (lifeRatio > 0.8) {
      // Fade out and create ripple
      droplet.opacity = (1 - lifeRatio) / 0.2 * 0.8;
      droplet.rippleRadius = (lifeRatio - 0.8) / 0.2 * 20;
      droplet.rippleOpacity = (1 - lifeRatio) / 0.2 * 0.5;
    }
    
    return droplet.life < droplet.maxLife;
  };

  // Draw droplet with realistic water effect
  const drawDroplet = (ctx: CanvasRenderingContext2D, droplet: Droplet) => {
    ctx.save();
    
    // Draw ripple effect
    if (droplet.rippleRadius > 0) {
      ctx.strokeStyle = `rgba(173, 216, 230, ${droplet.rippleOpacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(droplet.x, droplet.y, droplet.rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Secondary ripple
      if (droplet.rippleRadius > 5) {
        ctx.strokeStyle = `rgba(173, 216, 230, ${droplet.rippleOpacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(droplet.x, droplet.y, droplet.rippleRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Main droplet body
    const gradient = ctx.createRadialGradient(
      droplet.x - droplet.r * 0.3, droplet.y - droplet.r * 0.3, 0,
      droplet.x, droplet.y, droplet.r
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${droplet.opacity * 0.9})`);
    gradient.addColorStop(0.3, `rgba(173, 216, 230, ${droplet.opacity * 0.7})`);
    gradient.addColorStop(0.7, `rgba(135, 206, 235, ${droplet.opacity * 0.5})`);
    gradient.addColorStop(1, `rgba(70, 130, 180, ${droplet.opacity * 0.3})`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(droplet.x, droplet.y, droplet.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = `rgba(255, 255, 255, ${droplet.opacity * 0.6})`;
    ctx.beginPath();
    ctx.arc(droplet.x - droplet.r * 0.4, droplet.y - droplet.r * 0.4, droplet.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Refraction effect (darker edge)
    ctx.strokeStyle = `rgba(0, 50, 100, ${droplet.opacity * 0.4})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(droplet.x, droplet.y, droplet.r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isActive) {
      // Spawn new droplets based on intensity
      const spawnChance = intensity * 0.02 * (deltaTime / 16.67);
      if (Math.random() < spawnChance && dropletsRef.current.length < intensity * 100) {
        dropletsRef.current.push(createDroplet(canvas));
      }
    }

    // Update and draw droplets
    dropletsRef.current = dropletsRef.current.filter(droplet => {
      const alive = updateDroplet(droplet, deltaTime);
      if (alive) {
        drawDroplet(ctx, droplet);
      }
      return alive;
    });

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
  }, [isActive, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-20 ${className}`}
      style={{
        width: '100%',
        height: '100%',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 2s ease-in-out'
      }}
    />
  );
};

export default WaterDroplets;
