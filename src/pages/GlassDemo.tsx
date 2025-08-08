import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  HeartIcon,
  StarIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  BoltIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/glass';

const GlassDemo: React.FC = () => {
  const { theme, config } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const demoCards = [
    { variant: 'subtle', icon: CloudIcon, title: 'Subtle Glass', description: 'Minimal transparency' },
    { variant: 'default', icon: SparklesIcon, title: 'Default Glass', description: 'Balanced effect' },
    { variant: 'elevated', icon: StarIcon, title: 'Elevated Glass', description: 'Enhanced visibility' },
    { variant: 'strong', icon: BoltIcon, title: 'Strong Glass', description: 'Maximum effect' },
  ] as const;

  const demoButtons = [
    { variant: 'primary', icon: HeartIcon, label: 'Primary' },
    { variant: 'secondary', icon: SunIcon, label: 'Secondary' },
    { variant: 'accent', icon: FireIcon, label: 'Accent' },
    { variant: 'ghost', icon: MoonIcon, label: 'Ghost' },
  ] as const;

  return (
    <motion.div
      className="min-h-screen p-6 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard variant="elevated" className="p-8 text-center">
            <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-white" />
            <h1 className="text-4xl font-bold text-white mb-2">
              Glass UI Demo
            </h1>
            <p className="text-white/80 text-lg">
              Experience the beauty of glassmorphism effects
            </p>
            <div className="mt-4 text-sm text-white/60">
              Current theme: <span className="font-medium">{theme}</span> | 
              Glass effects: <span className="font-medium">{config.enableGlassEffects ? 'Enabled' : 'Disabled'}</span> |
              Variant: <span className="font-medium">{config.glassVariant}</span> |
              Blur: <span className="font-medium">{config.blurIntensity}</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Glass Card Variants */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="elevated" className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Glass Card Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {demoCards.map((card, index) => (
                <motion.div
                  key={card.variant}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <GlassCard 
                    variant={card.variant} 
                    className="p-6 text-center hover:scale-105 transition-transform duration-300"
                    hover
                  >
                    <card.icon className="w-12 h-12 mx-auto mb-4 text-white" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {card.title}
                    </h3>
                    <p className="text-white/70 text-sm">
                      {card.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Glass Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard variant="elevated" className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Glass Button Variants</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {demoButtons.map((button, index) => (
                <motion.div
                  key={button.variant}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
                >
                  <GlassButton
                    variant={button.variant}
                    size="lg"
                    className="w-full justify-center"
                  >
                    <button.icon className="w-5 h-5 mr-2" />
                    {button.label}
                  </GlassButton>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <GlassButton variant="primary" size="sm">Small</GlassButton>
              <GlassButton variant="secondary" size="md">Medium</GlassButton>
              <GlassButton variant="accent" size="lg">Large</GlassButton>
              <GlassButton variant="ghost" size="xl">Extra Large</GlassButton>
            </div>
          </GlassCard>
        </motion.div>

        {/* Glass Inputs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard variant="elevated" className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Glass Input Components</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <GlassInput
                  label="Default Input"
                  placeholder="Enter some text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <GlassInput
                  label="With Icon"
                  placeholder="Search..."
                  icon={<SparklesIcon className="w-5 h-5" />}
                  variant="filled"
                />
                <GlassInput
                  label="Outlined Variant"
                  placeholder="Outlined style..."
                  variant="outlined"
                  size="lg"
                />
              </div>
              <div className="space-y-4">
                <GlassInput
                  label="Error State"
                  placeholder="This has an error..."
                  error="This field is required"
                  variant="default"
                />
                <GlassInput
                  label="With Helper Text"
                  placeholder="Helper text example..."
                  helperText="This is some helpful information"
                  size="sm"
                />
                <GlassInput
                  label="Right Icon"
                  placeholder="Icon on the right..."
                  icon={<HeartIcon className="w-5 h-5" />}
                  iconPosition="right"
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Interactive Demo */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <GlassCard variant="elevated" className="p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Interactive Demo</h2>
            <p className="text-white/80 mb-6">
              Click the button below to see a glass modal in action
            </p>
            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => setShowModal(true)}
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Open Glass Modal
            </GlassButton>
          </GlassCard>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <GlassCard variant="subtle" className="p-4 text-center">
            <p className="text-white/60 text-sm">
              Glass UI components powered by react-glass-ui and Tailwind CSS
            </p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Glass Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Glass Modal Demo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            This is a beautiful glass modal with backdrop blur and transparency effects.
            The modal automatically handles focus management, escape key closing, and overlay clicks.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <GlassCard variant="subtle" className="p-4 text-center">
              <StarIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
              <p className="text-sm font-medium">Feature 1</p>
            </GlassCard>
            <GlassCard variant="subtle" className="p-4 text-center">
              <HeartIcon className="w-8 h-8 mx-auto mb-2 text-accent-500" />
              <p className="text-sm font-medium">Feature 2</p>
            </GlassCard>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <GlassButton variant="primary" className="flex-1">
              Confirm
            </GlassButton>
            <GlassButton 
              variant="ghost" 
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </motion.div>
  );
};

export default GlassDemo;
