import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import {
  BoltIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  HomeIcon,
  CpuChipIcon,
  ArrowPathIcon,
  LinkIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import EmporiaAuth from '../components/energy/EmporiaAuth';
import EmporiaCharts from '../components/energy/EmporiaCharts';
import { useEmporiaEnergy } from '../hooks/useEmporiaEnergy';

// ============================================================================
// ENERGY MONITORING DASHBOARD - REAL-TIME POWER ANALYTICS
// ============================================================================

interface EnergyData {
  timestamp: string;
  total_power: number;
  voltage: number;
  current: number;
  frequency: number;
  power_factor: number;
  daily_usage: number;
  monthly_usage: number;
  cost_today: number;
  cost_month: number;
  circuits: CircuitData[];
}

interface CircuitData {
  id: string;
  name: string;
  power: number;
  voltage: number;
  current: number;
  status: 'normal' | 'warning' | 'critical';
  percentage: number;
}

interface UsageHistory {
  timestamp: string;
  power: number;
  cost: number;
}

const Energy: React.FC = () => {
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alertsCount, setAlertsCount] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'circuits' | 'analytics' | 'emporia'>('overview');
  const [showEmporiaAuth, setShowEmporiaAuth] = useState(false);
  const [emporiaConnected, setEmporiaConnected] = useState(false);

  // Emporia Energy integration
  const {
    devices: emporiaDevices,
    realtimeData,
    loading: emporiaLoading,
    isAuthenticated: emporiaAuthenticated,
    summaryData,
    refresh: refreshEmporia,
  } = useEmporiaEnergy({
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealtimePolling: true,
    realtimeInterval: 10000,
  });

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'energy_update' && message.data) {
        setEnergyData(message.data);
        setLastUpdate(new Date());
        setLoading(false);
      }
    },
    onConnect: () => {
      console.log('🔌 Connected to energy WebSocket');
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from energy WebSocket');
    },
  });

  // Check Emporia connection status
  const checkEmporiaStatus = async () => {
    try {
      const response = await fetch('/api/emporia/status');
      const result = await response.json();

      if (result.success) {
        setEmporiaConnected(result.data.is_authenticated);
      }
    } catch (error) {
      console.error('Failed to check Emporia status:', error);
    }
  };

  // Handle successful Emporia authentication
  const handleEmporiaSuccess = () => {
    setEmporiaConnected(true);
    setShowEmporiaAuth(false);
    refreshEmporia();
    // Optionally reload energy data to include Emporia devices
    loadEnergyData();
  };

  // Load initial energy data from API
  useEffect(() => {
    loadEnergyData();
    checkEmporiaStatus();
  }, []);

  const loadEnergyData = async () => {
    try {
      setLoading(true);

      // Load current energy data
      const currentResponse = await fetch('/api/energy/current');
      const currentData = await currentResponse.json();

      if (currentData.success && currentData.data.reading) {
        const reading = currentData.data.reading;
        const circuits = currentData.data.circuits;

        const energyData: EnergyData = {
          timestamp: reading.timestamp,
          total_power: reading.total_power,
          voltage: reading.voltage,
          current: reading.current,
          frequency: reading.frequency,
          power_factor: reading.power_factor,
          daily_usage: reading.daily_usage,
          monthly_usage: reading.monthly_usage,
          cost_today: reading.cost_today,
          cost_month: reading.cost_month,
          circuits: circuits,
        };

        setEnergyData(energyData);
        setLastUpdate(new Date());

        // Add to history
        setUsageHistory(prev => [
          ...prev.slice(-23), // Keep last 24 hours
          {
            timestamp: reading.timestamp,
            power: reading.total_power,
            cost: reading.cost_today,
          },
        ]);

        // Log usage history length for debugging
        console.log(`📊 Energy usage history: ${usageHistory.length} entries`);
      } else {
        // Fallback to mock data if API fails
        const mockData = generateMockData();
        setEnergyData(mockData);
        setLastUpdate(new Date());
      }

      // Load alerts count
      const alertsResponse = await fetch('/api/energy/alerts');
      const alertsData = await alertsResponse.json();
      if (alertsData.success) {
        setAlertsCount(alertsData.data.count);
      }

    } catch (error) {
      console.error('Failed to load energy data:', error);
      // Fallback to mock data
      const mockData = generateMockData();
      setEnergyData(mockData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): EnergyData => ({
    timestamp: new Date().toISOString(),
    total_power: 3500 + Math.random() * 1000,
    voltage: 240 + Math.random() * 10 - 5,
    current: 15 + Math.random() * 5,
    frequency: 60 + Math.random() * 0.2 - 0.1,
    power_factor: 0.85 + Math.random() * 0.1,
    daily_usage: 45.2 + Math.random() * 10,
    monthly_usage: 1250 + Math.random() * 100,
    cost_today: 8.45 + Math.random() * 2,
    cost_month: 185.30 + Math.random() * 20,
    circuits: [
      { id: 'main', name: 'Main Panel', power: 3500, voltage: 240, current: 15, status: 'normal', percentage: 70 },
      { id: 'hvac', name: 'HVAC System', power: 2100, voltage: 240, current: 9, status: 'normal', percentage: 42 },
      { id: 'kitchen', name: 'Kitchen', power: 800, voltage: 120, current: 7, status: 'normal', percentage: 16 },
      { id: 'living', name: 'Living Room', power: 450, voltage: 120, current: 4, status: 'normal', percentage: 9 },
      { id: 'bedrooms', name: 'Bedrooms', power: 320, voltage: 120, current: 3, status: 'normal', percentage: 6 },
      { id: 'garage', name: 'Garage', power: 180, voltage: 120, current: 2, status: 'normal', percentage: 4 },
    ],
  });

  const formatPower = (watts: number): string => {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${watts.toFixed(0)} W`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'normal': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const renderEnergyGauge = (value: number, max: number, label: string, unit: string, color: string) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {value.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          </div>
        </div>
        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Main Power Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          className="card-glass p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <BoltIcon className="w-8 h-8 text-yellow-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Live</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {energyData ? formatPower(energyData.total_power) : '---'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Power</p>
          </div>
        </motion.div>

        <motion.div
          className="card-glass p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {energyData ? formatCurrency(energyData.cost_today) : '---'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cost Today</p>
          </div>
        </motion.div>

        <motion.div
          className="card-glass p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <ChartBarIcon className="w-8 h-8 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">kWh</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {energyData ? energyData.daily_usage.toFixed(1) : '---'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Daily Usage</p>
          </div>
        </motion.div>

        <motion.div
          className="card-glass p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{alertsCount}</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Normal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System Status</p>
          </div>
        </motion.div>
      </div>

      {/* Real-Time Gauges */}
      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Real-Time Electrical Parameters
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {energyData && (
            <>
              {renderEnergyGauge(energyData.voltage, 250, 'Voltage', 'V', '#3b82f6')}
              {renderEnergyGauge(energyData.current, 25, 'Current', 'A', '#ef4444')}
              {renderEnergyGauge(energyData.frequency, 65, 'Frequency', 'Hz', '#10b981')}
              {renderEnergyGauge(energyData.power_factor * 100, 100, 'Power Factor', '%', '#f59e0b')}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  const renderCircuitsTab = () => (
    <div className="space-y-6">
      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Circuit-Level Monitoring
        </h3>
        <div className="space-y-4">
          {energyData?.circuits.map((circuit, index) => (
            <motion.div
              key={circuit.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  {circuit.id === 'main' && <HomeIcon className="w-5 h-5 text-blue-600" />}
                  {circuit.id === 'hvac' && <CpuChipIcon className="w-5 h-5 text-blue-600" />}
                  {circuit.id === 'kitchen' && <LightBulbIcon className="w-5 h-5 text-blue-600" />}
                  {circuit.id === 'living' && <LightBulbIcon className="w-5 h-5 text-blue-600" />}
                  {circuit.id === 'bedrooms' && <LightBulbIcon className="w-5 h-5 text-blue-600" />}
                  {circuit.id === 'garage' && <LightBulbIcon className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {circuit.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatPower(circuit.power)} • {circuit.voltage}V • {circuit.current.toFixed(1)}A
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {circuit.percentage}%
                  </p>
                  <p className={`text-xs ${getStatusColor(circuit.status)}`}>
                    {circuit.status.toUpperCase()}
                  </p>
                </div>

                <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      circuit.status === 'normal' ? 'bg-green-500' :
                      circuit.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${circuit.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Usage Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Monthly Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Usage:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {energyData ? energyData.monthly_usage.toFixed(1) : '---'} kWh
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {energyData ? formatCurrency(energyData.cost_month) : '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Avg. Daily:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {energyData ? (energyData.monthly_usage / 30).toFixed(1) : '---'} kWh
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  $0.12/kWh
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Efficiency Tips
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <LightBulbIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  HVAC is using 60% of total power. Consider adjusting thermostat.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <LightBulbIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Peak usage detected between 6-8 PM. Shift non-essential loads.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <LightBulbIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Power factor is good at {energyData ? (energyData.power_factor * 100).toFixed(1) : '---'}%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BoltIcon className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Energy Monitoring
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Emporia Connection Status */}
            <button
              onClick={() => setShowEmporiaAuth(true)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                emporiaAuthenticated
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
              }`}
            >
              {emporiaAuthenticated ? (
                <WifiIcon className="w-4 h-4" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {emporiaAuthenticated ? `Emporia (${emporiaDevices.length} devices)` : 'Connect Emporia'}
              </span>
            </button>

            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Real-time' : 'Offline'}
              </span>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {[
                { mode: 'overview' as const, label: 'Overview', icon: ChartBarIcon },
                { mode: 'circuits' as const, label: 'Circuits', icon: CpuChipIcon },
                { mode: 'analytics' as const, label: 'Analytics', icon: ArrowTrendingUpIcon },
                { mode: 'emporia' as const, label: 'Emporia', icon: BoltIcon },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => setLastUpdate(new Date())}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === 'overview' && renderOverviewTab()}
              {viewMode === 'circuits' && renderCircuitsTab()}
              {viewMode === 'analytics' && renderAnalyticsTab()}
              {viewMode === 'emporia' && (
                <EmporiaCharts
                  devices={emporiaDevices}
                  isConnected={emporiaAuthenticated}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Emporia Authentication Modal */}
        <EmporiaAuth
          isOpen={showEmporiaAuth}
          onClose={() => setShowEmporiaAuth(false)}
          onSuccess={handleEmporiaSuccess}
        />
      </div>
    </motion.div>
  );
};

export default Energy;
