import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../components/glass';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="p-8 text-center">
            {/* HolmesOS Logo */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                duration: 1,
                delay: 0.2
              }}
            >
              <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <img 
                  src="/src/logo/HolmesOS-lightgray.png" 
                  alt="HolmesOS" 
                  className="w-16 h-16 object-contain"
                />
              </div>
            </motion.div>

            {/* Error Icon */}
            <motion.div
              className="mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto" />
            </motion.div>

            {/* 404 Text */}
            <motion.h1
              className="text-6xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              404
            </motion.h1>

            {/* Error Message */}
            <motion.h2
              className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Page Not Found
            </motion.h2>

            <motion.p
              className="text-gray-600 dark:text-gray-400 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              The page you're looking for doesn't exist in the HolmesOS system. 
              It might have been moved, deleted, or you entered the wrong URL.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <GlassButton
                onClick={() => navigate('/')}
                variant="primary"
                className="flex items-center justify-center space-x-2"
              >
                <HomeIcon className="w-5 h-5" />
                <span>Go Home</span>
              </GlassButton>

              <GlassButton
                onClick={() => navigate(-1)}
                variant="secondary"
                className="flex items-center justify-center space-x-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Go Back</span>
              </GlassButton>
            </motion.div>

            {/* HolmesOS Branding */}
            <motion.div
              className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400">
                <img 
                  src="/src/logo/HolmesOS-lightgray.png" 
                  alt="HolmesOS" 
                  className="w-6 h-6 object-contain opacity-60"
                />
                <span className="text-sm">
                  HolmesOS v1.0.0 • Smart Home Management System
                </span>
              </div>
            </motion.div>
          </GlassCard>
        </motion.div>

        {/* Background Animation */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 2 }}
        >
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
