import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  WifiIcon,
  Battery0Icon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { GlassButton } from './glass';

const TopBar: React.FC = () => {
  const { theme, toggleTheme, getGlassClasses } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-top">
      {/* Glass background */}
      <div className={`absolute inset-0 ${getGlassClasses('elevated', 'lg')} border-b`} />
      
      {/* Content */}
      <div className="relative h-16 px-4 flex items-center justify-between">
        {/* Left side - Logo and Status indicators */}
        <div className="flex items-center space-x-3">
          {/* HolmesOS Logo */}
          <motion.div
            className="flex items-center space-x-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <img
              src="/src/logo/HolmesOS-lightgray.png"
              alt="HolmesOS"
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
              HolmesOS
            </span>
          </motion.div>

          {/* Online/Offline indicator */}
          <motion.div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              isOnline
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <WifiIcon className="w-3 h-3" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </motion.div>

          {/* Signal strength */}
          <motion.div
            className="text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <SignalIcon className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Center - Time and Date */}
        <div className="flex flex-col items-center">
          <motion.div
            className="text-2xl font-bold text-gray-900 dark:text-white"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {formatTime(currentTime)}
          </motion.div>
          <motion.div
            className="text-sm text-gray-600 dark:text-gray-400"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {formatDate(currentTime)}
          </motion.div>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <GlassButton
            variant="ghost"
            size="sm"
            className="relative !p-2 !rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <BellIcon className="w-5 h-5" />
            {notifications > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {notifications > 9 ? '9+' : notifications}
              </motion.div>
            )}
          </GlassButton>

          {/* Theme toggle */}
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="!p-2 !rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </motion.div>
          </GlassButton>

          {/* Battery indicator (for mobile devices) */}
          <motion.div
            className="hidden sm:flex items-center space-x-1 text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Battery0Icon className="w-4 h-4" />
            <span className="text-xs">100%</span>
          </motion.div>
        </div>
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
    </div>
  );
};

export default TopBar;
