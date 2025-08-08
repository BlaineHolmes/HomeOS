import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// ============================================================================
// EMPORIA ENERGY HOOK - DEVICE DISCOVERY AND REAL-TIME ENERGY DATA
// ============================================================================

interface EmporiaDevice {
  deviceGid: number;
  manufacturerDeviceId: string;
  model: string;
  firmware: string;
  parentDeviceGid: number | null;
  isConnected: boolean;
  offlineSince: string | null;
  channels: string;
  parsedChannels?: EmporiaChannel[];
}

interface EmporiaChannel {
  channelNum: string;
  name: string;
  currentUsage: number;
  percentage: number;
}

interface EmporiaCredentials {
  username: string;
  customer_id?: number;
  token_expires?: Date;
}

interface EmporiaRealtimeData {
  device_gid: number;
  timestamp: Date;
  channels: {
    [channelNum: number]: {
      usage_watts: number;
      voltage: number;
      current_amps: number;
      power_factor: number;
      frequency: number;
    };
  };
}

interface EmporiaStatus {
  is_authenticated: boolean;
  credentials: EmporiaCredentials | null;
  device_count: number;
  devices: Array<{
    device_gid: number;
    device_name: string;
    model: string;
    is_online: boolean;
    channel_count: number;
    last_seen: Date;
  }>;
}

interface UseEmporiaEnergyOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtimePolling?: boolean;
  realtimeInterval?: number;
}

export const useEmporiaEnergy = (options: UseEmporiaEnergyOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealtimePolling = true,
    realtimeInterval = 10000, // 10 seconds
  } = options;

  // State management
  const [status, setStatus] = useState<EmporiaStatus | null>(null);
  const [devices, setDevices] = useState<EmporiaDevice[]>([]);
  const [realtimeData, setRealtimeData] = useState<EmporiaRealtimeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load status and check authentication
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/emporia/status');
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
        setIsAuthenticated(result.data.is_authenticated);
        
        if (result.data.devices) {
          setDevices(result.data.devices.map((device: any) => ({
            ...device,
            last_seen: new Date(device.last_seen),
          })));
        }
      } else {
        setError(result.error || 'Failed to load status');
      }
    } catch (error: any) {
      console.error('Error loading Emporia status:', error);
      setError(error.message);
    }
  }, []);

  // Authenticate with Emporia Energy
  const authenticate = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/emporia/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAuthenticated(true);
        setStatus({
          is_authenticated: true,
          credentials: result.data.credentials,
          device_count: result.data.devices.length,
          devices: result.data.devices,
        });
        setDevices(result.data.devices);
        
        toast.success('Successfully connected to Emporia Energy!');
        return true;
      } else {
        setError(result.error || 'Authentication failed');
        toast.error(result.error || 'Authentication failed');
        return false;
      }
    } catch (error: any) {
      console.error('Emporia authentication error:', error);
      setError(error.message);
      toast.error('Failed to connect to Emporia Energy');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Discover devices
  const discoverDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/emporia/discover', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setDevices(result.data.devices);
        toast.success(`Discovered ${result.data.discovered_count} devices`);
        return result.data.devices;
      } else {
        setError(result.error || 'Device discovery failed');
        toast.error(result.error || 'Device discovery failed');
        return [];
      }
    } catch (error: any) {
      console.error('Device discovery error:', error);
      setError(error.message);
      toast.error('Failed to discover devices');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get real-time data
  const getRealtimeData = useCallback(async () => {
    try {
      if (!isAuthenticated) return [];

      const response = await fetch('/api/emporia/realtime');
      const result = await response.json();

      if (result.success) {
        const processedData = result.data.realtime_data.map((data: any) => ({
          ...data,
          timestamp: new Date(data.timestamp),
        }));
        
        setRealtimeData(processedData);
        return processedData;
      } else {
        setError(result.error || 'Failed to get real-time data');
        return [];
      }
    } catch (error: any) {
      console.error('Real-time data error:', error);
      setError(error.message);
      return [];
    }
  }, [isAuthenticated]);

  // Get device details
  const getDevice = useCallback(async (deviceGid: number) => {
    try {
      const response = await fetch(`/api/emporia/device/${deviceGid}`);
      const result = await response.json();

      if (result.success) {
        return {
          ...result.data.device,
          last_seen: new Date(result.data.device.last_seen),
        };
      } else {
        setError(result.error || 'Failed to get device data');
        return null;
      }
    } catch (error: any) {
      console.error('Device data error:', error);
      setError(error.message);
      return null;
    }
  }, []);

  // Get historical data
  const getHistoricalData = useCallback(async (
    deviceGid: number,
    scale: '1MIN' | '15MIN' | '1H' | '1D' | '1MON' = '1H',
    start?: Date,
    end?: Date
  ) => {
    try {
      const params = new URLSearchParams({
        scale,
        ...(start && { start: start.toISOString() }),
        ...(end && { end: end.toISOString() }),
      });

      const response = await fetch(`/api/emporia/device/${deviceGid}/history?${params}`);
      const result = await response.json();

      if (result.success) {
        return result.data.historical_data;
      } else {
        setError(result.error || 'Failed to get historical data');
        return null;
      }
    } catch (error: any) {
      console.error('Historical data error:', error);
      setError(error.message);
      return null;
    }
  }, []);

  // Disconnect from Emporia
  const disconnect = useCallback(async () => {
    try {
      const response = await fetch('/api/emporia/disconnect', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setIsAuthenticated(false);
        setStatus(null);
        setDevices([]);
        setRealtimeData([]);
        setError(null);
        
        toast.success('Disconnected from Emporia Energy');
        return true;
      } else {
        setError(result.error || 'Failed to disconnect');
        return false;
      }
    } catch (error: any) {
      console.error('Disconnect error:', error);
      setError(error.message);
      return false;
    }
  }, []);

  // Calculate summary data from real-time data
  const getSummaryData = useCallback(() => {
    if (!realtimeData.length) return null;

    let totalWatts = 0;
    let totalVoltage = 0;
    let channelCount = 0;

    realtimeData.forEach(deviceData => {
      Object.values(deviceData.channels).forEach(channel => {
        if (channel.usage_watts) {
          totalWatts += channel.usage_watts;
        }
        if (channel.voltage) {
          totalVoltage += channel.voltage;
          channelCount++;
        }
      });
    });

    return {
      total_watts: Math.round(totalWatts),
      average_voltage: channelCount > 0 ? Math.round((totalVoltage / channelCount) * 10) / 10 : 0,
      total_devices: realtimeData.length,
      online_devices: devices.filter(d => d.is_online).length,
      timestamp: new Date(),
    };
  }, [realtimeData, devices]);

  // Initial load
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Auto-refresh status
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadStatus]);

  // Real-time data polling
  useEffect(() => {
    if (enableRealtimePolling && isAuthenticated) {
      const interval = setInterval(getRealtimeData, realtimeInterval);
      return () => clearInterval(interval);
    }
  }, [enableRealtimePolling, isAuthenticated, realtimeInterval, getRealtimeData]);

  return {
    // Data
    status,
    devices,
    realtimeData,
    loading,
    error,
    isAuthenticated,
    
    // Actions
    authenticate,
    discoverDevices,
    getRealtimeData,
    getDevice,
    getHistoricalData,
    disconnect,
    loadStatus,
    
    // Computed
    summaryData: getSummaryData(),
    
    // Utilities
    refresh: () => {
      loadStatus();
      if (isAuthenticated) {
        getRealtimeData();
      }
    },
    clearError: () => setError(null),
  };
};
