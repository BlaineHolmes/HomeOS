import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const { theme } = useTheme();

  const getVariantClasses = () => {
    const isDark = theme === 'dark';
    
    switch (variant) {
      case 'filled':
        return isDark
          ? 'bg-white/10 border-white/20 focus:bg-white/15'
          : 'bg-black/5 border-black/10 focus:bg-black/10';
      case 'outlined':
        return isDark
          ? 'bg-transparent border-white/30 focus:border-white/50'
          : 'bg-transparent border-black/20 focus:border-black/30';
      default:
        return isDark
          ? 'bg-white/5 border-white/15 focus:bg-white/10'
          : 'bg-white/70 border-white/30 focus:bg-white/80';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-3 text-lg';
      default:
        return 'px-4 py-2.5 text-base';
    }
  };

  const inputClasses = cn(
    'w-full rounded-lg border backdrop-blur-md',
    'transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    'text-gray-900 dark:text-white',
    getVariantClasses(),
    getSizeClasses(),
    icon && iconPosition === 'left' && 'pl-10',
    icon && iconPosition === 'right' && 'pr-10',
    error && 'border-red-500/50 focus:border-red-500/70',
    className
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={cn(
            'absolute inset-y-0 flex items-center pointer-events-none',
            'text-gray-400 dark:text-gray-500',
            iconPosition === 'left' ? 'left-3' : 'right-3'
          )}>
            {icon}
          </div>
        )}
        
        <motion.input
          ref={ref}
          className={inputClasses}
          whileFocus={{ scale: 1.01 }}
          {...props}
        />
        
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

GlassInput.displayName = 'GlassInput';

export default GlassInput;
