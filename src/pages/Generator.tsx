import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import {
  BoltIcon,
  PlayIcon,
  StopIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  CpuChipIcon,
  SignalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Generator status interfaces
interface GeneratorStatus {
  isRunning: boolean;
  voltage: number;
  frequency: number;
  power: number;
  fuelLevel: number;
  temperature: number;
  runtime: number;
  lastMaintenance: string;
  nextMaintenance: string;
  alarms: string[];
  model: string;
  serialNumber: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastSeen: string;
  signalStrength: number;
  errors: string[];
}

const Generator: React.FC = () => {
  const [generatorStatus, setGeneratorStatus] = useState<GeneratorStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [controlLoading, setControlLoading] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'generator_status' && message.data) {
        setGeneratorStatus(message.data.status);
        setConnectionStatus(message.data.connection);
        setLastUpdate(new Date());
        setLoading(false);
      } else if (message.type === 'system_status' && message.data?.generator) {
        setConnectionStatus(prev => ({
          ...prev,
          connected: message.data.generator.connected,
          lastSeen: new Date().toISOString(),
        } as ConnectionStatus));
      } else if (message.type === 'generator_control' && message.data) {
        setControlLoading(null);
        // Handle control response
        console.log('Generator control response:', message.data);
      }
    },
    onConnect: () => {
      console.log('🔌 Connected to generator WebSocket');
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from generator WebSocket');
    },
  });

  // Load initial data from API
  useEffect(() => {
    const loadGeneratorData = async () => {
      try {
        const response = await fetch('/api/generator/status');
        const data = await response.json();

        if (data.success) {
          setGeneratorStatus(data.data.status);
          setConnectionStatus(data.data.connection);
        }
      } catch (error) {
        console.error('❌ Failed to load generator data:', error);
      } finally {
        setLoading(false);
        setLastUpdate(new Date());
      }
    };

    loadGeneratorData();
  }, []);

  // Generator control functions
  const startGenerator = () => {
    setControlLoading('start');
    sendMessage({
      type: 'generator_control',
      data: { action: 'start' },
      timestamp: new Date().toISOString(),
      id: `start-${Date.now()}`,
    });
  };

  const stopGenerator = () => {
    setControlLoading('stop');
    sendMessage({
      type: 'generator_control',
      data: { action: 'stop' },
      timestamp: new Date().toISOString(),
      id: `stop-${Date.now()}`,
    });
  };

  const testConnection = () => {
    setControlLoading('test');
    sendMessage({
      type: 'generator_control',
      data: { action: 'test' },
      timestamp: new Date().toISOString(),
      id: `test-${Date.now()}`,
    });
  };

  // Format runtime
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div
      className="min-h-screen p-6 bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-yellow-900"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BoltIcon className="w-8 h-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Generator Monitor
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Last Update */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-glass p-8 text-center">
            <ArrowPathIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Loading Generator Data...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Connecting to generator via Modbus TCP...
            </p>
          </div>
        ) : !connectionStatus?.connected ? (
          <div className="card-glass p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Generator Offline
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Unable to connect to the generator. Check Modbus TCP connection.
            </p>
            <button
              onClick={testConnection}
              disabled={controlLoading === 'test'}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              {controlLoading === 'test' ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <WrenchScrewdriverIcon className="w-5 h-5" />
              )}
              <span>{controlLoading === 'test' ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Running Status */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                    <p className={`text-2xl font-bold ${
                      generatorStatus?.isRunning ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {generatorStatus?.isRunning ? 'Running' : 'Standby'}
                    </p>
                  </div>
                  {generatorStatus?.isRunning ? (
                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  ) : (
                    <ClockIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              </motion.div>

              {/* Power Output */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Power</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {generatorStatus?.power || 0} kW
                    </p>
                  </div>
                  <BoltIcon className="w-8 h-8 text-blue-500" />
                </div>
              </motion.div>

              {/* Fuel Level */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fuel</p>
                    <p className={`text-2xl font-bold ${
                      (generatorStatus?.fuelLevel || 0) > 25 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {generatorStatus?.fuelLevel || 0}%
                    </p>
                  </div>
                  <FireIcon className={`w-8 h-8 ${
                    (generatorStatus?.fuelLevel || 0) > 25 ? 'text-green-500' : 'text-red-500'
                  }`} />
                </div>
              </motion.div>

              {/* Temperature */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temp</p>
                    <p className={`text-2xl font-bold ${
                      (generatorStatus?.temperature || 0) > 200 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {generatorStatus?.temperature || 0}°F
                    </p>
                  </div>
                  <CpuChipIcon className={`w-8 h-8 ${
                    (generatorStatus?.temperature || 0) > 200 ? 'text-red-500' : 'text-green-500'
                  }`} />
                </div>
              </motion.div>
            </div>

            {/* Control Panel */}
            <motion.div
              className="card-glass p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Generator Controls
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={startGenerator}
                  disabled={generatorStatus?.isRunning || controlLoading === 'start'}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {controlLoading === 'start' ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <PlayIcon className="w-5 h-5" />
                  )}
                  <span>{controlLoading === 'start' ? 'Starting...' : 'Start'}</span>
                </button>

                <button
                  onClick={stopGenerator}
                  disabled={!generatorStatus?.isRunning || controlLoading === 'stop'}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {controlLoading === 'stop' ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <StopIcon className="w-5 h-5" />
                  )}
                  <span>{controlLoading === 'stop' ? 'Stopping...' : 'Stop'}</span>
                </button>

                <button
                  onClick={testConnection}
                  disabled={controlLoading === 'test'}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {controlLoading === 'test' ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <WrenchScrewdriverIcon className="w-5 h-5" />
                  )}
                  <span>{controlLoading === 'test' ? 'Testing...' : 'Test'}</span>
                </button>
              </div>
            </motion.div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Electrical Metrics */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Electrical Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Voltage:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {generatorStatus?.voltage || 0}V
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Frequency:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {generatorStatus?.frequency || 0} Hz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Runtime:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatRuntime(generatorStatus?.runtime || 0)}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Maintenance Info */}
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Maintenance
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Model:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {generatorStatus?.model || 'mebay DC9xD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Service:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {generatorStatus?.lastMaintenance || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Next Service:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {generatorStatus?.nextMaintenance || 'N/A'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Alarms */}
            {generatorStatus?.alarms && generatorStatus.alarms.length > 0 && (
              <motion.div
                className="card-glass p-6 border-l-4 border-red-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span>Active Alarms</span>
                </h3>
                <div className="space-y-2">
                  {generatorStatus.alarms.map((alarm, index) => (
                    <div key={index} className="text-red-600 dark:text-red-400">
                      • {alarm}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Generator;
