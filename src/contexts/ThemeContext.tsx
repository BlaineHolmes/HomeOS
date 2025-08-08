import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type GlassVariant = 'subtle' | 'default' | 'elevated' | 'strong';
type BlurIntensity = 'sm' | 'md' | 'lg' | 'xl';

interface ThemeConfig {
  glassVariant: GlassVariant;
  blurIntensity: BlurIntensity;
  enableAnimations: boolean;
  enableGlassEffects: boolean;
}

interface ThemeContextType {
  theme: Theme;
  config: ThemeConfig;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  updateConfig: (config: Partial<ThemeConfig>) => void;
  getGlassClasses: (variant?: GlassVariant, blur?: BlurIntensity) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('homeos-theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  const [config, setConfig] = useState<ThemeConfig>(() => {
    const savedConfig = localStorage.getItem('homeos-theme-config');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch {
        // Fall back to defaults if parsing fails
      }
    }

    return {
      glassVariant: 'default',
      blurIntensity: 'md',
      enableAnimations: true,
      enableGlassEffects: true,
    };
  });

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('homeos-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('homeos-theme');
      if (!savedTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const updateConfig = (newConfig: Partial<ThemeConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    localStorage.setItem('homeos-theme-config', JSON.stringify(updatedConfig));
  };

  const getGlassClasses = (variant?: GlassVariant, blur?: BlurIntensity): string => {
    if (!config.enableGlassEffects) {
      return theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200';
    }

    const glassVariant = variant || config.glassVariant;
    const blurIntensity = blur || config.blurIntensity;
    const isDark = theme === 'dark';

    // Base classes
    let classes = 'backdrop-blur-' + blurIntensity + ' border';

    // Variant-specific classes
    switch (glassVariant) {
      case 'subtle':
        classes += isDark
          ? ' bg-white/5 border-white/10'
          : ' bg-white/60 border-white/30';
        break;
      case 'elevated':
        classes += isDark
          ? ' bg-white/10 border-white/20'
          : ' bg-white/80 border-white/40';
        break;
      case 'strong':
        classes += isDark
          ? ' bg-white/20 border-white/30'
          : ' bg-white/90 border-white/50';
        break;
      default: // 'default'
        classes += isDark
          ? ' bg-white/8 border-white/15'
          : ' bg-white/70 border-white/35';
    }

    return classes;
  };

  // Save config changes to localStorage
  useEffect(() => {
    localStorage.setItem('homeos-theme-config', JSON.stringify(config));
  }, [config]);

  const value: ThemeContextType = {
    theme,
    config,
    toggleTheme,
    setTheme,
    updateConfig,
    getGlassClasses,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
