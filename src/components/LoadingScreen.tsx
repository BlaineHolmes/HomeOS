import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// HolmesOS logo will be loaded from public folder

const LoadingScreen: React.FC = () => {
  const [loadingText, setLoadingText] = useState('Initializing HolmesOS...');
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    'Initializing HolmesOS...',
    'Connecting to services...',
    'Loading dashboard...',
    'Preparing interface...',
    'Almost ready...',
  ];

  useEffect(() => {
    let stepIndex = 0;
    let progressValue = 0;

    const interval = setInterval(() => {
      progressValue += Math.random() * 20 + 10;
      
      if (progressValue >= 100) {
        progressValue = 100;
        setProgress(100);
        clearInterval(interval);
        return;
      }

      setProgress(progressValue);

      // Update loading text based on progress
      const newStepIndex = Math.floor((progressValue / 100) * loadingSteps.length);
      if (newStepIndex !== stepIndex && newStepIndex < loadingSteps.length) {
        stepIndex = newStepIndex;
        setLoadingText(loadingSteps[stepIndex]);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        {/* HolmesOS Logo */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1
          }}
        >
          <div className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <img
              src="/src/logo/HolmesOS-lightgray.png"
              alt="HolmesOS"
              className="w-24 h-24 object-contain"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          HolmesOS
        </motion.h1>

        <motion.p
          className="text-lg text-gray-600 dark:text-gray-400 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Intelligent Home Management System
        </motion.p>

        {/* Progress Bar */}
        <motion.div
          className="w-80 mx-auto mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </span>
          </div>
        </motion.div>

        {/* Loading Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={loadingText}
            className="text-gray-700 dark:text-gray-300 font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {loadingText}
          </motion.div>
        </AnimatePresence>

        {/* Loading Dots */}
        <motion.div
          className="flex justify-center space-x-1 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-primary-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* System Status */}
        <motion.div
          className="mt-12 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>System Status: Online</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Database: Connected</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Services: Starting</span>
          </div>
        </motion.div>

        {/* Version Info */}
        <motion.div
          className="mt-8 text-xs text-gray-400 dark:text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          HolmesOS v1.0.0 • Your Personal Smart Home Detective 🕵️‍♂️
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;
