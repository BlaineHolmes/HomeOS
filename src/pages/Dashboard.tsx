import React from 'react';
import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  CloudIcon, 
  CalendarIcon, 
  ArchiveBoxIcon,
  BoltIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      className="p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Section */}
      <motion.div
        className="mb-8"
        variants={itemVariants}
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome Home! 🏠
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Everything looks good. Here's your dashboard overview.
        </p>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        variants={containerVariants}
      >
        {/* Time Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <ClockIcon className="w-8 h-8 text-primary-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Current Time</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </motion.div>

        {/* Weather Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <CloudIcon className="w-8 h-8 text-blue-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Weather</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            72°F
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Partly Cloudy
          </div>
        </motion.div>

        {/* Calendar Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <CalendarIcon className="w-8 h-8 text-green-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Next Event</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            Family Dinner
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Today at 6:00 PM
          </div>
        </motion.div>

        {/* Packages Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <ArchiveBoxIcon className="w-8 h-8 text-orange-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Packages</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            2
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Arriving today
          </div>
        </motion.div>

        {/* Generator Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <BoltIcon className="w-8 h-8 text-yellow-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Generator</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="status-dot status-green"></div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Ready
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Mains available
          </div>
        </motion.div>

        {/* Chores Widget */}
        <motion.div
          className="card-glass p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <CheckCircleIcon className="w-8 h-8 text-purple-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Chores</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            3/5
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completed today
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        className="card-glass p-6"
        variants={itemVariants}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Kitchen lights turned off automatically
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              2 min ago
            </span>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Package delivered: Amazon order
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              1 hour ago
            </span>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Chore completed: Take out trash
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              3 hours ago
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
