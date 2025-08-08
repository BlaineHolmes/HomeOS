import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  SunIcon,
  MoonIcon,
  EyeIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard, GlassButton } from './glass';

const ThemeSettings: React.FC = () => {
  const { theme, config, toggleTheme, setTheme, updateConfig } = useTheme();
  const [showPreview, setShowPreview] = useState(false);

  // Debug logging
  console.log('ThemeSettings - Current theme:', theme);
  console.log('ThemeSettings - Current config:', config);
  console.log('ThemeSettings - Functions available:', { toggleTheme, setTheme, updateConfig });

  // Test handlers
  const handleLightMode = () => {
    console.log('handleLightMode called');
    try {
      setTheme('light');
      console.log('setTheme(light) executed');
    } catch (error) {
      console.error('Error setting light theme:', error);
    }
  };

  const handleDarkMode = () => {
    console.log('handleDarkMode called');
    try {
      setTheme('dark');
      console.log('setTheme(dark) executed');
    } catch (error) {
      console.error('Error setting dark theme:', error);
    }
  };

  const handleToggleGlass = () => {
    console.log('handleToggleGlass called, current state:', config.enableGlassEffects);
    try {
      updateConfig({ enableGlassEffects: !config.enableGlassEffects });
      console.log('updateConfig executed');
    } catch (error) {
      console.error('Error updating glass config:', error);
    }
  };

  const glassVariants = [
    { value: 'subtle', label: 'Subtle', description: 'Minimal glass effect' },
    { value: 'default', label: 'Default', description: 'Balanced glass effect' },
    { value: 'elevated', label: 'Elevated', description: 'Enhanced glass effect' },
    { value: 'strong', label: 'Strong', description: 'Maximum glass effect' },
  ] as const;

  const blurIntensities = [
    { value: 'sm', label: 'Light', description: 'Subtle blur' },
    { value: 'md', label: 'Medium', description: 'Balanced blur' },
    { value: 'lg', label: 'Strong', description: 'Heavy blur' },
    { value: 'xl', label: 'Maximum', description: 'Intense blur' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Debug Section - Testing different button types */}
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
        <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Configuration Status</h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
          Current theme: <strong>{theme}</strong> |
          Glass effects: <strong>{config.enableGlassEffects ? 'Enabled' : 'Disabled'}</strong> |
          Glass variant: <strong>{config.glassVariant}</strong> |
          Blur intensity: <strong>{config.blurIntensity}</strong>
        </p>
        <div className="space-y-2">
          <div className="text-xs text-yellow-600 dark:text-yellow-400">Regular HTML buttons:</div>
          <div className="space-x-2">
            <button
              onClick={handleLightMode}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer"
            >
              Light
            </button>
            <button
              onClick={handleDarkMode}
              className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 cursor-pointer"
            >
              Dark
            </button>
            <button
              onClick={handleToggleGlass}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 cursor-pointer"
            >
              Toggle Glass
            </button>
          </div>
        </div>
      </div>
      {/* Theme Mode */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Theme Mode
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose between light and dark themes
            </p>
          </div>
          <GlassButton
            variant="ghost"
            onClick={toggleTheme}
            className="!p-3 !rounded-full"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? (
                <SunIcon className="w-6 h-6" />
              ) : (
                <MoonIcon className="w-6 h-6" />
              )}
            </motion.div>
          </GlassButton>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <GlassButton
              variant={theme === 'light' ? 'primary' : 'ghost'}
              onClick={handleLightMode}
            >
              <SunIcon className="w-5 h-5 mr-2" />
              Light Mode (Glass)
            </GlassButton>
            <GlassButton
              variant={theme === 'dark' ? 'primary' : 'ghost'}
              onClick={handleDarkMode}
            >
              <MoonIcon className="w-5 h-5 mr-2" />
              Dark Mode (Glass)
            </GlassButton>
          </div>

          {/* Simple GlassButton test with text only */}
          <div className="grid grid-cols-2 gap-3">
            <GlassButton
              variant={theme === 'light' ? 'primary' : 'ghost'}
              onClick={handleLightMode}
            >
              Light Mode (Simple)
            </GlassButton>
            <GlassButton
              variant={theme === 'dark' ? 'primary' : 'ghost'}
              onClick={handleDarkMode}
            >
              Dark Mode (Simple)
            </GlassButton>
          </div>

          {/* Regular HTML buttons for comparison */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleLightMode}
              className={`flex items-center justify-start px-4 py-2 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200'
              }`}
            >
              <SunIcon className="w-5 h-5 mr-2" />
              Light Mode (HTML)
            </button>
            <button
              onClick={handleDarkMode}
              className={`flex items-center justify-start px-4 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200'
              }`}
            >
              <MoonIcon className="w-5 h-5 mr-2" />
              Dark Mode (HTML)
            </button>
          </div>
        </div>

        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Your theme preference is automatically saved and will persist across sessions.
            The system will also respect your OS theme preference if you haven't manually selected one.
          </p>
        </div>
      </GlassCard>

      {/* Glass Effects */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Glass Effects
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable or disable glassmorphism effects
            </p>
          </div>
          <GlassButton
            variant={config.enableGlassEffects ? 'primary' : 'ghost'}
            onClick={handleToggleGlass}
            size="sm"
          >
            {config.enableGlassEffects ? 'Enabled' : 'Disabled'}
          </GlassButton>
        </div>

        {!config.enableGlassEffects && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🔒 Glass effects are disabled. Components will use solid backgrounds instead.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Glass Variant */}
      {config.enableGlassEffects && (
        <GlassCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Glass Intensity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust the glass effect intensity
            </p>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Current: <strong>{config.glassVariant}</strong>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {glassVariants.map((variant) => (
              <GlassButton
                key={variant.value}
                variant={config.glassVariant === variant.value ? 'primary' : 'ghost'}
                onClick={() => {
                  console.log('Updating glass variant to:', variant.value);
                  updateConfig({ glassVariant: variant.value });
                }}
                className="flex-col !py-4"
              >
                <span className="font-medium">{variant.label}</span>
                <span className="text-xs opacity-70">{variant.description}</span>
              </GlassButton>
            ))}
          </div>

          {/* Live Preview of Glass Variant */}
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Live Preview:</p>
            <GlassCard className="p-4 text-center">
              <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
              <p className="text-sm font-medium">Current Glass Effect</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Variant: {config.glassVariant} | Blur: {config.blurIntensity}
              </p>
            </GlassCard>
          </div>
        </GlassCard>
      )}

      {/* Blur Intensity */}
      {config.enableGlassEffects && (
        <GlassCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Blur Intensity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control the background blur strength
            </p>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Current: <strong>{config.blurIntensity}</strong>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {blurIntensities.map((blur) => (
              <GlassButton
                key={blur.value}
                variant={config.blurIntensity === blur.value ? 'primary' : 'ghost'}
                onClick={() => {
                  console.log('Updating blur intensity to:', blur.value);
                  updateConfig({ blurIntensity: blur.value });
                }}
                className="flex-col !py-4"
              >
                <span className="font-medium">{blur.label}</span>
                <span className="text-xs opacity-70">{blur.description}</span>
              </GlassButton>
            ))}
          </div>

          {/* Live Preview of Blur Intensity */}
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Live Preview:</p>
            <GlassCard className="p-4 text-center">
              <AdjustmentsHorizontalIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
              <p className="text-sm font-medium">Current Blur Effect</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Variant: {config.glassVariant} | Blur: {config.blurIntensity}
              </p>
            </GlassCard>
          </div>
        </GlassCard>
      )}

      {/* Animations */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Animations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable smooth transitions and animations
            </p>
          </div>
          <GlassButton
            variant={config.enableAnimations ? 'primary' : 'ghost'}
            onClick={() => updateConfig({ enableAnimations: !config.enableAnimations })}
            size="sm"
          >
            {config.enableAnimations ? 'Enabled' : 'Disabled'}
          </GlassButton>
        </div>

        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚡ <strong>Performance:</strong> Disabling animations can improve performance on slower devices.
          </p>
        </div>
      </GlassCard>

      {/* Background Settings */}
      <GlassCard className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Background
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Beautiful mountain background is always visible
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded"></div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Mountain Background</p>
                <p className="text-sm text-green-600 dark:text-green-400">Active across all pages</p>
              </div>
            </div>
            <div className="text-green-600 dark:text-green-400">
              ✓ Enabled
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            The beautiful cross-mountain.jpg background image is automatically applied to all pages
            and works perfectly with the glass morphism effects.
          </div>
        </div>
      </GlassCard>

      {/* Preview */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See how your theme settings look
            </p>
          </div>
          <GlassButton
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            size="sm"
          >
            <EyeIcon className="w-5 h-5 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </GlassButton>
        </div>

        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <GlassCard variant="subtle" className="p-4 text-center">
                <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                <p className="text-sm font-medium">Subtle</p>
              </GlassCard>
              <GlassCard variant="default" className="p-4 text-center">
                <AdjustmentsHorizontalIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                <p className="text-sm font-medium">Default</p>
              </GlassCard>
              <GlassCard variant="elevated" className="p-4 text-center">
                <EyeIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                <p className="text-sm font-medium">Elevated</p>
              </GlassCard>
            </div>
            
            <div className="flex space-x-3">
              <GlassButton variant="primary" size="sm">Primary</GlassButton>
              <GlassButton variant="secondary" size="sm">Secondary</GlassButton>
              <GlassButton variant="accent" size="sm">Accent</GlassButton>
              <GlassButton variant="ghost" size="sm">Ghost</GlassButton>
            </div>
          </motion.div>
        )}
      </GlassCard>

      {/* Reset Settings */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reset Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Restore all appearance settings to their defaults
            </p>
          </div>
          <GlassButton
            variant="ghost"
            onClick={() => {
              updateConfig({
                glassVariant: 'default',
                blurIntensity: 'md',
                enableAnimations: true,
                enableGlassEffects: true,
              });
              // Don't reset theme - let user keep their preference
            }}
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Reset to Defaults
          </GlassButton>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⚠️ This will reset glass effects, blur intensity, and animation settings to their defaults.
            Your theme preference (light/dark) will be preserved.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default ThemeSettings;
