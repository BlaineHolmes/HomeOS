import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LightningBolt {
  id: string;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  branches: LightningBranch[];
  intensity: number;
}

interface LightningBranch {
  path: string;
  intensity: number;
}

interface LightningEffectProps {
  isActive: boolean;
  intensity?: 'light' | 'moderate' | 'heavy';
  className?: string;
  onLightningStrike?: () => void;
}

const LightningEffect: React.FC<LightningEffectProps> = ({
  isActive,
  intensity = 'moderate',
  className = '',
  onLightningStrike
}) => {
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([]);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lightning frequency based on intensity (strikes per 2 minutes)
  const strikeFrequency = {
    light: 5,    // 5 strikes per 2 min
    moderate: 8, // 8 strikes per 2 min  
    heavy: 12    // 12 strikes per 2 min
  };

  // Generate a realistic lightning path using fractal-like branching
  const generateLightningPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    segments: number = 8
  ): string => {
    const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;
      
      // Add random jaggedness
      const jitterX = (Math.random() - 0.5) * 60 * (1 - Math.abs(progress - 0.5) * 2);
      const jitterY = (Math.random() - 0.5) * 20;
      
      points.push({
        x: baseX + jitterX,
        y: baseY + jitterY
      });
    }
    
    points.push({ x: endX, y: endY });
    
    // Create SVG path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    return path;
  };

  // Parse SVG path to extract points for branch generation
  const parsePathPoints = (path: string): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const commands = path.match(/[ML]\s*[\d.-]+\s*[\d.-]+/g) || [];

    commands.forEach(command => {
      const coords = command.match(/[\d.-]+/g);
      if (coords && coords.length >= 2) {
        points.push({
          x: parseFloat(coords[0]),
          y: parseFloat(coords[1])
        });
      }
    });

    return points;
  };

  // Generate lightning branches along the main path
  const generateBranches = (mainPath: string, intensity: number): LightningBranch[] => {
    const branches: LightningBranch[] = [];
    const branchCount = Math.floor(Math.random() * 3) + 1;

    // Parse the main path to get points along the lightning bolt
    const mainPoints = parsePathPoints(mainPath);
    if (mainPoints.length < 2) return branches;

    for (let i = 0; i < branchCount; i++) {
      // Select a random point along the main path (avoid start and end)
      const pointIndex = Math.floor(Math.random() * (mainPoints.length - 2)) + 1;
      const branchStart = mainPoints[pointIndex];

      const branchLength = 50 + Math.random() * 100;
      const branchAngle = (Math.random() - 0.5) * Math.PI * 0.8; // ±72 degrees

      // Calculate branch end point relative to the start point
      const endX = branchStart.x + Math.cos(branchAngle) * branchLength;
      const endY = branchStart.y + Math.sin(branchAngle) * branchLength;

      branches.push({
        path: generateLightningPath(branchStart.x, branchStart.y, endX, endY, 4),
        intensity: intensity * 0.6
      });
    }

    return branches;
  };

  // Create a lightning bolt
  const createLightningBolt = (): LightningBolt => {
    if (!containerRef.current) {
      return {
        id: Math.random().toString(36),
        path: '',
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        branches: [],
        intensity: 1
      };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const startX = Math.random() * rect.width;
    const startY = -20;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = rect.height + 20;
    const boltIntensity = 0.8 + Math.random() * 0.4;

    const mainPath = generateLightningPath(startX, startY, endX, endY, 12);
    const branches = generateBranches(mainPath, boltIntensity);

    return {
      id: Math.random().toString(36),
      path: mainPath,
      startX,
      startY,
      endX,
      endY,
      branches,
      intensity: boltIntensity
    };
  };

  // Trigger lightning strike
  const triggerLightning = () => {
    if (!isActive) return;

    const bolt = createLightningBolt();
    setLightningBolts([bolt]);

    // Flash effect
    setFlashOpacity(0.4);
    setTimeout(() => setFlashOpacity(0.2), 50);
    setTimeout(() => setFlashOpacity(0), 150);

    // Call callback
    onLightningStrike?.();

    // Remove bolt after animation
    setTimeout(() => {
      setLightningBolts([]);
    }, 300);

    // Schedule next lightning
    scheduleNextLightning();
  };

  // Schedule next lightning strike
  const scheduleNextLightning = () => {
    if (!isActive) return;

    const baseInterval = (2 * 60 * 1000) / strikeFrequency[intensity]; // Base interval for even distribution
    const randomVariation = baseInterval * 0.8; // ±80% variation
    const nextStrike = baseInterval + (Math.random() - 0.5) * randomVariation;

    timeoutRef.current = setTimeout(triggerLightning, Math.max(1000, nextStrike));
  };

  // Start/stop lightning based on active state
  useEffect(() => {
    if (isActive) {
      // Start with a random delay (0-10 seconds)
      const initialDelay = Math.random() * 10000;
      timeoutRef.current = setTimeout(triggerLightning, initialDelay);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLightningBolts([]);
      setFlashOpacity(0);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, intensity]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 30 }}
    >
      {/* Lightning Flash Overlay */}
      <motion.div
        className="absolute inset-0 bg-white"
        style={{ opacity: flashOpacity }}
        animate={{ opacity: flashOpacity }}
        transition={{ duration: 0.1 }}
      />

      {/* Lightning Bolts */}
      <AnimatePresence>
        {lightningBolts.map((bolt) => (
          <motion.svg
            key={bolt.id}
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {/* Main lightning bolt */}
            <motion.path
              d={bolt.path}
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="3"
              fill="none"
              filter="url(#lightning-glow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            />
            
            {/* Lightning core (brighter) */}
            <motion.path
              d={bolt.path}
              stroke="rgba(173, 216, 230, 1)"
              strokeWidth="1"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            />

            {/* Branches */}
            {bolt.branches.map((branch, index) => (
              <motion.path
                key={index}
                d={branch.path}
                stroke={`rgba(255, 255, 255, ${branch.intensity})`}
                strokeWidth="2"
                fill="none"
                filter="url(#lightning-glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.08, delay: 0.02, ease: "easeOut" }}
              />
            ))}

            {/* SVG Filters */}
            <defs>
              <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </motion.svg>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LightningEffect;
