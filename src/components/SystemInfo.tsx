import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  ServerIcon,
  ClockIcon,
  CodeBracketIcon,
  HeartIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from './glass';

interface SystemStats {
  version: string;
  uptime: string;
  platform: string;
  nodeVersion: string;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkStatus: 'online' | 'offline';
  lastUpdate: string;
}

const SystemInfo: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock system stats - in production, this would come from an API
  useEffect(() => {
    const loadSystemStats = () => {
      // Simulate API call
      setTimeout(() => {
        setSystemStats({
          version: '1.0.0',
          uptime: '5d 12h 34m',
          platform: 'Windows 11',
          nodeVersion: '18.17.0',
          memoryUsage: {
            used: 2.4,
            total: 8.0,
            percentage: 30,
          },
          cpuUsage: 15,
          diskUsage: {
            used: 125,
            total: 500,
            percentage: 25,
          },
          networkStatus: 'online',
          lastUpdate: new Date().toISOString(),
        });
        setLoading(false);
      }, 1000);
    };

    loadSystemStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading system information...</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* HolmesOS Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard className="p-8 text-center">
          {/* Logo */}
          <motion.div
            className="mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              duration: 1
            }}
          >
            <div className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center shadow-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20">
              <img 
                src="/src/logo/HolmesOS-lightgray.png" 
                alt="HolmesOS" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            HolmesOS
          </motion.h1>

          <motion.p
            className="text-lg text-gray-600 dark:text-gray-400 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Intelligent Home Management System
          </motion.p>

          <motion.div
            className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <span>Version {systemStats?.version}</span>
            <span>•</span>
            <span>Built with</span>
            <HeartIcon className="w-4 h-4 text-red-500" />
            <span>by Jacob Holmes</span>
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* System Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Statistics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Usage */}
          <GlassCard className="p-4 text-center">
            <CpuChipIcon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats?.cpuUsage}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</p>
          </GlassCard>

          {/* Memory Usage */}
          <GlassCard className="p-4 text-center">
            <ServerIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats?.memoryUsage.percentage}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Memory ({formatBytes(systemStats?.memoryUsage.used * 1024 * 1024 * 1024 || 0)} / {formatBytes(systemStats?.memoryUsage.total * 1024 * 1024 * 1024 || 0)})
            </p>
          </GlassCard>

          {/* Disk Usage */}
          <GlassCard className="p-4 text-center">
            <ServerIcon className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats?.diskUsage.percentage}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Disk ({systemStats?.diskUsage.used}GB / {systemStats?.diskUsage.total}GB)
            </p>
          </GlassCard>

          {/* Uptime */}
          <GlassCard className="p-4 text-center">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemStats?.uptime}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
          </GlassCard>
        </div>
      </motion.div>

      {/* System Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Information
        </h3>
        
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CodeBracketIcon className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Platform</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{systemStats?.platform}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <BoltIcon className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Node.js Version</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">v{systemStats?.nodeVersion}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Network Status</p>
                  <p className={`text-sm font-medium ${
                    systemStats?.networkStatus === 'online' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {systemStats?.networkStatus === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ShieldCheckIcon className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Last Update</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {systemStats?.lastUpdate ? new Date(systemStats.lastUpdate).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Integrated Features
        </h3>
        
        <GlassCard className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { name: 'Energy Monitoring', icon: '⚡', status: 'Active' },
              { name: 'Network Management', icon: '🌐', status: 'Active' },
              { name: 'Calendar Sync', icon: '📅', status: 'Active' },
              { name: 'Package Tracking', icon: '📦', status: 'Active' },
              { name: 'Chore Management', icon: '✅', status: 'Active' },
              { name: 'Grocery Lists', icon: '🛒', status: 'Active' },
              { name: 'Music Control', icon: '🎵', status: 'Active' },
              { name: 'Weather Info', icon: '🌤️', status: 'Active' },
            ].map((feature, index) => (
              <motion.div
                key={feature.name}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.name}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{feature.status}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default SystemInfo;
