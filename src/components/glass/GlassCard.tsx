import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface GlassCardProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'strong';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  shadow?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant,
  blur,
  border = true,
  shadow = true,
  hover = false,
  onClick,
  ...motionProps
}) => {
  const { theme, config, getGlassClasses } = useTheme();

  // Use global theme configuration if no specific variant/blur is provided
  const effectiveVariant = variant || config.glassVariant;
  const effectiveBlur = blur || config.blurIntensity;

  const getVariantClasses = () => {
    if (!config.enableGlassEffects) {
      return theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200';
    }

    const isDark = theme === 'dark';

    switch (effectiveVariant) {
      case 'elevated':
        return isDark
          ? 'bg-white/10 border-white/20'
          : 'bg-white/80 border-white/40';
      case 'subtle':
        return isDark
          ? 'bg-white/5 border-white/10'
          : 'bg-white/60 border-white/30';
      case 'strong':
        return isDark
          ? 'bg-white/20 border-white/30'
          : 'bg-white/90 border-white/50';
      default:
        return isDark
          ? 'bg-white/8 border-white/15'
          : 'bg-white/70 border-white/35';
    }
  };

  const getBlurClasses = () => {
    if (!config.enableGlassEffects) {
      return '';
    }

    switch (effectiveBlur) {
      case 'sm':
        return 'backdrop-blur-sm';
      case 'lg':
        return 'backdrop-blur-lg';
      case 'xl':
        return 'backdrop-blur-xl';
      default:
        return 'backdrop-blur-md';
    }
  };

  const getShadowClasses = () => {
    if (!shadow) return '';
    
    return theme === 'dark'
      ? 'shadow-glass-dark'
      : 'shadow-glass';
  };

  const getHoverClasses = () => {
    if (!hover) return '';
    
    return theme === 'dark'
      ? 'hover:bg-white/12 hover:border-white/25'
      : 'hover:bg-white/85 hover:border-white/45';
  };

  const baseClasses = cn(
    'relative overflow-hidden transition-all duration-300',
    getBlurClasses(),
    getVariantClasses(),
    getShadowClasses(),
    getHoverClasses(),
    border && 'border',
    onClick && 'cursor-pointer',
    className
  );

  return (
    <motion.div
      className={baseClasses}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      {...motionProps}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default GlassCard;
