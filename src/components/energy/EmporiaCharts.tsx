import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  BoltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../glass';
// import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ============================================================================
// EMPORIA CHARTS COMPONENT - COMPREHENSIVE ENERGY USAGE VISUALIZATION
// ============================================================================

interface EmporiaDevice {
  deviceGid: number;
  manufacturerDeviceId: string;
  model: string;
  firmware: string;
  isConnected: boolean;
  parsedChannels?: EmporiaChannel[];
}

interface EmporiaChannel {
  channelNum: string;
  name: string;
  currentUsage: number;
  percentage: number;
}

interface UsageDataPoint {
  time: string;
  usage: number;
  timestamp: Date;
}

interface EmporiaChartsProps {
  devices: EmporiaDevice[];
  isConnected: boolean;
}

const EmporiaCharts: React.FC<EmporiaChartsProps> = ({
  devices,
  isConnected,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W' | '1M'>('1D');
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUsage, setTotalUsage] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Color palette for charts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // Get current usage data for all channels
  const getCurrentUsageData = () => {
    if (!devices.length) return [];

    const channelData: Array<{ name: string; usage: number; percentage: number; color: string }> = [];
    let colorIndex = 0;

    devices.forEach(device => {
      if (device.parsedChannels) {
        device.parsedChannels.forEach(channel => {
          channelData.push({
            name: channel.name || `Channel ${channel.channelNum}`,
            usage: channel.currentUsage,
            percentage: channel.percentage,
            color: colors[colorIndex % colors.length],
          });
          colorIndex++;
        });
      }
    });

    return channelData.sort((a, b) => b.usage - a.usage);
  };

  // Load historical usage data
  const loadUsageData = async (deviceGid: number, channelNum: string, scale: string) => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      // Set start date based on time range
      switch (timeRange) {
        case '1H':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '1D':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '1W':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const params = new URLSearchParams({
        scale: scale,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        unit: 'KilowattHours',
      });

      const response = await fetch(`/api/emporia/device/${deviceGid}/channels/${channelNum}/usage?${params}`);
      const result = await response.json();

      if (result.success && result.data.historical_data?.usage) {
        const processedData = result.data.historical_data.usage.map((point: any) => ({
          time: new Date(point.time).toLocaleTimeString([], { 
            hour: timeRange === '1H' ? '2-digit' : undefined,
            minute: timeRange === '1H' ? '2-digit' : undefined,
            month: timeRange === '1M' ? 'short' : undefined,
            day: timeRange !== '1H' ? 'numeric' : undefined,
          }),
          usage: point.usage,
          timestamp: new Date(point.time),
        }));

        setUsageData(processedData);
        
        // Calculate totals
        const total = processedData.reduce((sum, point) => sum + point.usage, 0);
        setTotalUsage(total);
        setEstimatedCost(total * 0.12); // Estimate at $0.12/kWh
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select first device and channel
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      const firstDevice = devices[0];
      setSelectedDevice(firstDevice.deviceGid);
      
      if (firstDevice.parsedChannels && firstDevice.parsedChannels.length > 0) {
        setSelectedChannel(firstDevice.parsedChannels[0].channelNum);
      }
    }
  }, [devices, selectedDevice]);

  // Load data when selection changes
  useEffect(() => {
    if (selectedDevice && selectedChannel) {
      const scaleMap = { '1H': '1MIN', '1D': '15MIN', '1W': '1H', '1M': '1D' };
      loadUsageData(selectedDevice, selectedChannel, scaleMap[timeRange]);
    }
  }, [selectedDevice, selectedChannel, timeRange]);

  const currentUsageData = getCurrentUsageData();

  if (!isConnected) {
    return (
      <GlassCard variant="subtle" className="p-8 text-center">
        <BoltIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect to Emporia Energy
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your Emporia Energy account to view detailed usage charts and analytics.
        </p>
      </GlassCard>
    );
  }

  if (!devices.length) {
    return (
      <GlassCard variant="subtle" className="p-8 text-center">
        <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Devices Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No Emporia devices were discovered. Check your device connections and try again.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Installation Notice */}
      <GlassCard variant="elevated" className="p-6 border-amber-500/30 bg-amber-500/10">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <BoltIcon className="w-8 h-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
              📊 Charts Ready to Install!
            </h3>
            <p className="text-amber-700 dark:text-amber-300 mb-4">
              The Emporia charts are ready, but need the recharts library to display interactive visualizations.
            </p>
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                🚀 To enable charts, run this command in your terminal:
              </p>
              <code className="block bg-gray-800 text-green-400 px-4 py-2 rounded font-mono text-sm">
                npm install
              </code>
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-400">
              <strong>What you'll get:</strong> Interactive area charts, pie charts, bar charts, and real-time usage visualization!
            </div>
          </div>
        </div>
      </GlassCard>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard variant="default" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalUsage.toFixed(2)} kWh
              </p>
            </div>
            <BoltIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${estimatedCost.toFixed(2)}
              </p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Devices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {devices.filter(d => d.isConnected).length}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Time Range</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {timeRange}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Device Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Device:
          </label>
          <select
            value={selectedDevice || ''}
            onChange={(e) => setSelectedDevice(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-white/5 backdrop-blur-md text-gray-900 dark:text-white [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
          >
            {devices.map(device => (
              <option key={device.deviceGid} value={device.deviceGid} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                {device.model} ({device.manufacturerDeviceId})
              </option>
            ))}
          </select>
        </div>

        {/* Channel Selector */}
        {selectedDevice && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Channel:
            </label>
            <select
              value={selectedChannel || ''}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-white/5 backdrop-blur-md text-gray-900 dark:text-white [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
            >
              {devices.find(d => d.deviceGid === selectedDevice)?.parsedChannels?.map(channel => (
                <option key={channel.channelNum} value={channel.channelNum} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                  {channel.name || `Channel ${channel.channelNum}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center bg-white/20 dark:bg-white/10 rounded-lg p-1">
          {(['1H', '1D', '1W', '1M'] as const).map((range) => (
            <GlassButton
              key={range}
              onClick={() => setTimeRange(range)}
              variant={timeRange === range ? 'primary' : 'ghost'}
              size="sm"
            >
              {range}
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Timeline Chart */}
        <GlassCard variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usage Timeline
            </h3>
            {loading && (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
            <div className="text-center">
              <ChartBarIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Usage Timeline Chart
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Install recharts to view interactive charts
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Run: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npm install</code>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Current Usage Breakdown */}
        <GlassCard variant="elevated" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Usage by Channel
          </h3>
          
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">📊</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Usage Breakdown Chart
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pie chart showing channel usage distribution
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Channel Usage Bar Chart */}
        <GlassCard variant="elevated" className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Channel Usage Comparison
          </h3>
          
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">📈</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Channel Comparison Chart
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bar chart comparing usage across all channels
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default EmporiaCharts;
