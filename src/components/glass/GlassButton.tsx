import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface GlassButtonProps extends Omit<MotionProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...motionProps
}) => {
  const { theme, config } = useTheme();

  const getVariantClasses = () => {
    const isDark = theme === 'dark';
    
    switch (variant) {
      case 'primary':
        return isDark
          ? 'bg-primary-500/20 border-primary-400/30 text-primary-100 hover:bg-primary-500/30'
          : 'bg-primary-500/80 border-primary-400/40 text-white hover:bg-primary-500/90';
      case 'secondary':
        return isDark
          ? 'bg-secondary-500/20 border-secondary-400/30 text-secondary-100 hover:bg-secondary-500/30'
          : 'bg-secondary-500/80 border-secondary-400/40 text-white hover:bg-secondary-500/90';
      case 'accent':
        return isDark
          ? 'bg-accent-500/20 border-accent-400/30 text-accent-100 hover:bg-accent-500/30'
          : 'bg-accent-500/80 border-accent-400/40 text-white hover:bg-accent-500/90';
      case 'ghost':
        return isDark
          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          : 'bg-black/5 border-black/10 text-gray-900 hover:bg-black/10';
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      case 'xl':
        return 'px-8 py-4 text-xl';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  // Use global blur intensity if glass effects are enabled
  const getBlurClass = () => {
    if (!config.enableGlassEffects) return '';

    switch (config.blurIntensity) {
      case 'sm': return 'backdrop-blur-sm';
      case 'lg': return 'backdrop-blur-lg';
      case 'xl': return 'backdrop-blur-xl';
      default: return 'backdrop-blur-md';
    }
  };

  const baseClasses = cn(
    'relative overflow-hidden rounded-lg border',
    getBlurClass(),
    'font-medium transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95',
    getVariantClasses(),
    getSizeClasses(),
    className
  );

  return (
    <button
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center space-x-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </div>
    </button>
  );
};

export default GlassButton;
