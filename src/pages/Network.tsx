import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiIcon,
  SignalIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  TvIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../components/glass';

// ============================================================================
// NETWORK MONITORING PAGE - TP-LINK ER605 ROUTER MANAGEMENT
// ============================================================================

interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: 'desktop' | 'mobile' | 'tv' | 'speaker' | 'other';
  status: 'online' | 'offline';
  bandwidth_up: number;
  bandwidth_down: number;
  connected_time: string;
  last_seen: string;
}

interface NetworkStats {
  wan_status: 'connected' | 'disconnected' | 'connecting';
  wan_ip: string;
  wan_gateway: string;
  wan_dns: string[];
  lan_ip: string;
  total_devices: number;
  online_devices: number;
  total_bandwidth_up: number;
  total_bandwidth_down: number;
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  temperature: number;
}

interface SecurityEvent {
  id: string;
  type: 'intrusion' | 'blocked' | 'warning';
  message: string;
  source_ip: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

const Network: React.FC = () => {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: GlobeAltIcon },
    { id: 'devices', label: 'Devices', icon: DevicePhoneMobileIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'performance', label: 'Performance', icon: CpuChipIcon },
  ];

  // Load network data
  const loadNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch network stats
      const statsResponse = await fetch('/api/network/stats');
      const statsData = await statsResponse.json();

      // Fetch connected devices
      const devicesResponse = await fetch('/api/network/devices');
      const devicesData = await devicesResponse.json();

      // Fetch security events
      const securityResponse = await fetch('/api/network/security');
      const securityData = await securityResponse.json();

      if (statsData.success) {
        setNetworkStats(statsData.data);
      }

      if (devicesData.success) {
        setDevices(devicesData.data.devices);
      }

      if (securityData.success) {
        setSecurityEvents(securityData.data.events);
      }

    } catch (err) {
      console.error('Failed to load network data:', err);
      setError('Failed to connect to TP-Link ER605 router');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    loadNetworkData();

    if (autoRefresh) {
      const interval = setInterval(loadNetworkData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop': return ComputerDesktopIcon;
      case 'mobile': return DevicePhoneMobileIcon;
      case 'tv': return TvIcon;
      case 'speaker': return SpeakerWaveIcon;
      default: return WifiIcon;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (uptime: string) => {
    // Convert uptime string to human readable format
    return uptime || '0d 0h 0m';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* WAN Status */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">WAN Connection</h3>
          <div className={`flex items-center space-x-2 ${
            networkStats?.wan_status === 'connected' ? 'text-green-400' : 'text-red-400'
          }`}>
            {networkStats?.wan_status === 'connected' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
            <span className="capitalize">{networkStats?.wan_status || 'Unknown'}</span>
          </div>
        </div>
        
        {networkStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400">WAN IP</p>
              <p className="text-white font-mono">{networkStats.wan_ip}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Gateway</p>
              <p className="text-white font-mono">{networkStats.wan_gateway}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">LAN IP</p>
              <p className="text-white font-mono">{networkStats.lan_ip}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="text-white">{formatUptime(networkStats.uptime)}</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <DevicePhoneMobileIcon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
          <p className="text-2xl font-bold text-white">{networkStats?.online_devices || 0}</p>
          <p className="text-sm text-gray-400">Online Devices</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <SignalIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold text-white">
            {formatBytes(networkStats?.total_bandwidth_down || 0)}/s
          </p>
          <p className="text-sm text-gray-400">Download</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <SignalIcon className="w-8 h-8 mx-auto mb-2 text-orange-400 transform rotate-180" />
          <p className="text-2xl font-bold text-white">
            {formatBytes(networkStats?.total_bandwidth_up || 0)}/s
          </p>
          <p className="text-sm text-gray-400">Upload</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <CpuChipIcon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
          <p className="text-2xl font-bold text-white">{networkStats?.cpu_usage || 0}%</p>
          <p className="text-sm text-gray-400">CPU Usage</p>
        </GlassCard>
      </div>
    </div>
  );

  const renderDevicesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Connected Devices</h3>
        <p className="text-gray-400">{devices.length} total devices</p>
      </div>

      {devices.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <DevicePhoneMobileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Devices Found</h3>
          <p className="text-gray-400">No devices are currently connected to the network.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.type);
            return (
              <GlassCard key={device.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DeviceIcon className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">{device.name}</p>
                      <p className="text-sm text-gray-400 font-mono">{device.ip}</p>
                      <p className="text-xs text-gray-500 font-mono">{device.mac}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        ↓ {formatBytes(device.bandwidth_down)}/s
                      </p>
                      <p className="text-sm text-gray-400">
                        ↑ {formatBytes(device.bandwidth_up)}/s
                      </p>
                      <p className="text-xs text-gray-500">
                        Connected: {device.connected_time}
                      </p>
                    </div>

                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-3 h-3 rounded-full ${
                        device.status === 'online' ? 'bg-green-400' : 'bg-red-400'
                      }`} />

                      {device.status === 'online' && (
                        <div className="flex space-x-1">
                          <GlassButton
                            onClick={() => console.log('Block device:', device.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 text-xs px-2 py-1"
                          >
                            Block
                          </GlassButton>
                          <GlassButton
                            onClick={() => console.log('Limit device:', device.id)}
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 text-xs px-2 py-1"
                          >
                            Limit
                          </GlassButton>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Security Events</h3>
        <p className="text-gray-400">{securityEvents.length} recent events</p>
      </div>

      {securityEvents.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <ShieldCheckIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
          <p className="text-gray-400">No security events detected recently.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {securityEvents.map((event) => (
            <GlassCard key={event.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    event.severity === 'high' ? 'bg-red-400' :
                    event.severity === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`} />
                  <div>
                    <p className="font-medium text-white">{event.message}</p>
                    <p className="text-sm text-gray-400">Source: {event.source_ip}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.type === 'intrusion' ? 'bg-red-900 text-red-200' :
                  event.type === 'blocked' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-blue-900 text-blue-200'
                }`}>
                  {event.type.toUpperCase()}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Router Performance */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Router Performance</h3>

        {networkStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - networkStats.cpu_usage / 100)}`}
                    className="text-blue-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{networkStats.cpu_usage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">CPU Usage</p>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - networkStats.memory_usage / 100)}`}
                    className="text-green-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{networkStats.memory_usage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Memory Usage</p>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - networkStats.temperature / 100)}`}
                    className="text-orange-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{networkStats.temperature}°C</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Temperature</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassButton
            onClick={() => console.log('Restart WiFi')}
            variant="secondary"
            className="flex-col py-4"
          >
            <WifiIcon className="w-6 h-6 mb-2" />
            <span className="text-sm">Restart WiFi</span>
          </GlassButton>

          <GlassButton
            onClick={() => console.log('Reboot Router')}
            variant="secondary"
            className="flex-col py-4"
          >
            <ArrowPathIcon className="w-6 h-6 mb-2" />
            <span className="text-sm">Reboot Router</span>
          </GlassButton>

          <GlassButton
            onClick={() => console.log('View Logs')}
            variant="secondary"
            className="flex-col py-4"
          >
            <ExclamationTriangleIcon className="w-6 h-6 mb-2" />
            <span className="text-sm">View Logs</span>
          </GlassButton>

          <GlassButton
            onClick={() => console.log('Port Forwarding')}
            variant="secondary"
            className="flex-col py-4"
          >
            <GlobeAltIcon className="w-6 h-6 mb-2" />
            <span className="text-sm">Port Forward</span>
          </GlassButton>
        </div>
      </GlassCard>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <WifiIcon className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Network Monitor</h1>
              <p className="text-gray-400 mt-1">TP-Link ER605 Router Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <GlassButton
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'primary' : 'ghost'}
              size="sm"
            >
              <ClockIcon className="w-4 h-4 mr-1" />
              Auto Refresh
            </GlassButton>

            <GlassButton
              onClick={loadNetworkData}
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && !networkStats && (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <GlassCard className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Connection Failed</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <GlassButton onClick={loadNetworkData} variant="primary">
              Retry Connection
            </GlassButton>
          </GlassCard>
        )}

        {/* Tab Content */}
        {!loading && !error && networkStats && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {selectedTab === 'overview' && renderOverviewTab()}
              {selectedTab === 'devices' && renderDevicesTab()}
              {selectedTab === 'security' && renderSecurityTab()}
              {selectedTab === 'performance' && renderPerformanceTab()}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default Network;
