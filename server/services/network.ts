import axios from 'axios';
import crypto from 'crypto';

// ============================================================================
// NETWORK SERVICE - TP-LINK ER605 ROUTER MANAGEMENT
// ============================================================================

interface RouterConfig {
  host: string;
  username: string;
  password: string;
  timeout: number;
}

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

export class NetworkService {
  private static config: RouterConfig = {
    host: process.env.ROUTER_HOST || '192.168.1.1',
    username: process.env.ROUTER_USERNAME || 'admin',
    password: process.env.ROUTER_PASSWORD || 'admin',
    timeout: 10000,
  };

  private static sessionToken: string | null = null;
  private static sessionExpiry: number = 0;

  /**
   * Authenticate with the TP-Link ER605 router
   */
  private static async authenticate(): Promise<string> {
    try {
      // Check if we have a valid session
      if (this.sessionToken && Date.now() < this.sessionExpiry) {
        return this.sessionToken;
      }

      // Create authentication hash
      const authString = `${this.config.username}:${this.config.password}`;
      const authHash = crypto.createHash('md5').update(authString).digest('hex');

      const response = await axios.post(`http://${this.config.host}/cgi-bin/luci/`, {
        method: 'login',
        params: {
          username: this.config.username,
          password: authHash,
        }
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HomeOS/1.0',
        }
      });

      if (response.data.success) {
        this.sessionToken = response.data.stok;
        this.sessionExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
        return this.sessionToken;
      }

      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Router authentication failed:', error);
      throw new Error('Failed to authenticate with router');
    }
  }

  /**
   * Make authenticated API call to router
   */
  private static async apiCall(endpoint: string, params: any = {}): Promise<any> {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(`http://${this.config.host}/cgi-bin/luci/;stok=${token}/admin/${endpoint}`, {
        method: 'do',
        ...params
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Referer': `http://${this.config.host}/`,
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Router API call failed for ${endpoint}:`, error);
      
      // If authentication failed, clear session and retry once
      if (error.response?.status === 401) {
        this.sessionToken = null;
        this.sessionExpiry = 0;
        
        // Retry once
        try {
          const token = await this.authenticate();
          const response = await axios.post(`http://${this.config.host}/cgi-bin/luci/;stok=${token}/admin/${endpoint}`, {
            method: 'do',
            ...params
          }, {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json',
              'Referer': `http://${this.config.host}/`,
            }
          });
          return response.data;
        } catch (retryError) {
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get router statistics and status
   */
  static async getRouterStats(): Promise<NetworkStats> {
    try {
      // For demo purposes, return mock data
      // In production, this would make actual API calls to the TP-Link ER605
      
      const mockStats: NetworkStats = {
        wan_status: 'connected',
        wan_ip: '203.0.113.1',
        wan_gateway: '203.0.113.254',
        wan_dns: ['8.8.8.8', '8.8.4.4'],
        lan_ip: '192.168.1.1',
        total_devices: 12,
        online_devices: 8,
        total_bandwidth_up: 1024 * 1024 * 2, // 2 MB/s
        total_bandwidth_down: 1024 * 1024 * 15, // 15 MB/s
        uptime: '5d 12h 34m',
        cpu_usage: 25,
        memory_usage: 45,
        temperature: 42,
      };

      return mockStats;

      // Actual implementation would be:
      // const systemInfo = await this.apiCall('system/get_system_info');
      // const wanInfo = await this.apiCall('network/get_wan_info');
      // const lanInfo = await this.apiCall('network/get_lan_info');
      // const deviceList = await this.apiCall('wireless/get_device_list');
      // 
      // return {
      //   wan_status: wanInfo.wan_status,
      //   wan_ip: wanInfo.wan_ip,
      //   wan_gateway: wanInfo.gateway,
      //   wan_dns: wanInfo.dns_servers,
      //   lan_ip: lanInfo.lan_ip,
      //   total_devices: deviceList.total_num,
      //   online_devices: deviceList.online_num,
      //   total_bandwidth_up: systemInfo.bandwidth_up,
      //   total_bandwidth_down: systemInfo.bandwidth_down,
      //   uptime: systemInfo.uptime,
      //   cpu_usage: systemInfo.cpu_usage,
      //   memory_usage: systemInfo.memory_usage,
      //   temperature: systemInfo.temperature,
      // };
      
    } catch (error) {
      console.error('Failed to get router stats:', error);
      throw new Error('Failed to retrieve router statistics');
    }
  }

  /**
   * Get list of connected devices
   */
  static async getConnectedDevices(): Promise<NetworkDevice[]> {
    try {
      // For demo purposes, return mock data
      const mockDevices: NetworkDevice[] = [
        {
          id: 'device_1',
          name: 'Jacob\'s iPhone',
          ip: '192.168.1.100',
          mac: '00:11:22:33:44:55',
          type: 'mobile',
          status: 'online',
          bandwidth_up: 1024 * 50, // 50 KB/s
          bandwidth_down: 1024 * 200, // 200 KB/s
          connected_time: '2h 15m',
          last_seen: new Date().toISOString(),
        },
        {
          id: 'device_2',
          name: 'Living Room TV',
          ip: '192.168.1.101',
          mac: '00:11:22:33:44:56',
          type: 'tv',
          status: 'online',
          bandwidth_up: 1024 * 10, // 10 KB/s
          bandwidth_down: 1024 * 1024 * 5, // 5 MB/s
          connected_time: '1d 5h',
          last_seen: new Date().toISOString(),
        },
        {
          id: 'device_3',
          name: 'Home Office PC',
          ip: '192.168.1.102',
          mac: '00:11:22:33:44:57',
          type: 'desktop',
          status: 'online',
          bandwidth_up: 1024 * 100, // 100 KB/s
          bandwidth_down: 1024 * 500, // 500 KB/s
          connected_time: '8h 22m',
          last_seen: new Date().toISOString(),
        },
        {
          id: 'device_4',
          name: 'Smart Speaker',
          ip: '192.168.1.103',
          mac: '00:11:22:33:44:58',
          type: 'speaker',
          status: 'offline',
          bandwidth_up: 0,
          bandwidth_down: 0,
          connected_time: '0m',
          last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
      ];

      return mockDevices;

      // Actual implementation would be:
      // const deviceList = await this.apiCall('wireless/get_device_list');
      // return deviceList.devices.map(device => ({
      //   id: device.mac.replace(/:/g, ''),
      //   name: device.hostname || device.mac,
      //   ip: device.ip,
      //   mac: device.mac,
      //   type: this.detectDeviceType(device),
      //   status: device.online ? 'online' : 'offline',
      //   bandwidth_up: device.tx_rate || 0,
      //   bandwidth_down: device.rx_rate || 0,
      //   connected_time: device.connect_time || '0m',
      //   last_seen: device.last_seen || new Date().toISOString(),
      // }));
      
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      throw new Error('Failed to retrieve connected devices');
    }
  }

  /**
   * Get security events and logs
   */
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      // For demo purposes, return mock data
      const mockEvents: SecurityEvent[] = [
        {
          id: 'event_1',
          type: 'blocked',
          message: 'Blocked suspicious connection attempt',
          source_ip: '203.0.113.50',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          severity: 'medium',
        },
        {
          id: 'event_2',
          type: 'warning',
          message: 'High bandwidth usage detected',
          source_ip: '192.168.1.101',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          severity: 'low',
        },
      ];

      return mockEvents;
      
    } catch (error) {
      console.error('Failed to get security events:', error);
      throw new Error('Failed to retrieve security events');
    }
  }

  /**
   * Get bandwidth usage statistics
   */
  static async getBandwidthStats(timeframe: string): Promise<any> {
    try {
      // Mock bandwidth data for different timeframes
      const mockData = {
        '24h': {
          upload: Array.from({ length: 24 }, (_, i) => ({
            time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
            value: Math.random() * 1024 * 1024 * 5, // Random up to 5 MB/s
          })),
          download: Array.from({ length: 24 }, (_, i) => ({
            time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
            value: Math.random() * 1024 * 1024 * 20, // Random up to 20 MB/s
          })),
        }
      };

      return mockData[timeframe] || mockData['24h'];
      
    } catch (error) {
      console.error('Failed to get bandwidth stats:', error);
      throw new Error('Failed to retrieve bandwidth statistics');
    }
  }

  /**
   * Block a device
   */
  static async blockDevice(deviceId: string): Promise<any> {
    try {
      // In actual implementation:
      // return await this.apiCall('wireless/block_device', { device_id: deviceId });
      
      return { success: true, message: `Device ${deviceId} blocked` };
    } catch (error) {
      console.error('Failed to block device:', error);
      throw new Error('Failed to block device');
    }
  }

  /**
   * Unblock a device
   */
  static async unblockDevice(deviceId: string): Promise<any> {
    try {
      // In actual implementation:
      // return await this.apiCall('wireless/unblock_device', { device_id: deviceId });
      
      return { success: true, message: `Device ${deviceId} unblocked` };
    } catch (error) {
      console.error('Failed to unblock device:', error);
      throw new Error('Failed to unblock device');
    }
  }

  /**
   * Set bandwidth limit for a device
   */
  static async setBandwidthLimit(deviceId: string, limits: { upload: number; download: number }): Promise<any> {
    try {
      // In actual implementation:
      // return await this.apiCall('qos/set_device_limit', { 
      //   device_id: deviceId,
      //   upload_limit: limits.upload,
      //   download_limit: limits.download
      // });
      
      return { success: true, message: `Bandwidth limit set for device ${deviceId}` };
    } catch (error) {
      console.error('Failed to set bandwidth limit:', error);
      throw new Error('Failed to set bandwidth limit');
    }
  }

  /**
   * Get WiFi information
   */
  static async getWiFiInfo(): Promise<any> {
    try {
      return {
        ssid_2g: 'HomeOS_2.4G',
        ssid_5g: 'HomeOS_5G',
        channel_2g: 6,
        channel_5g: 36,
        clients_2g: 4,
        clients_5g: 8,
        signal_strength_2g: -45,
        signal_strength_5g: -38,
      };
    } catch (error) {
      console.error('Failed to get WiFi info:', error);
      throw new Error('Failed to retrieve WiFi information');
    }
  }

  /**
   * Restart WiFi radio
   */
  static async restartWiFi(): Promise<any> {
    try {
      return { success: true, message: 'WiFi restart initiated' };
    } catch (error) {
      console.error('Failed to restart WiFi:', error);
      throw new Error('Failed to restart WiFi');
    }
  }

  /**
   * Reboot the router
   */
  static async rebootRouter(): Promise<any> {
    try {
      return { success: true, message: 'Router reboot initiated' };
    } catch (error) {
      console.error('Failed to reboot router:', error);
      throw new Error('Failed to reboot router');
    }
  }

  /**
   * Get system logs
   */
  static async getSystemLogs(options: { level: string; limit: number }): Promise<any[]> {
    try {
      return [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System startup completed',
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'warning',
          message: 'High CPU usage detected',
        },
      ];
    } catch (error) {
      console.error('Failed to get system logs:', error);
      throw new Error('Failed to retrieve system logs');
    }
  }

  /**
   * Get port forwarding rules
   */
  static async getPortForwardingRules(): Promise<any[]> {
    try {
      return [
        {
          id: 'rule_1',
          name: 'Web Server',
          protocol: 'TCP',
          external_port: 80,
          internal_port: 8080,
          internal_ip: '192.168.1.100',
          enabled: true,
        },
      ];
    } catch (error) {
      console.error('Failed to get port forwarding rules:', error);
      throw new Error('Failed to retrieve port forwarding rules');
    }
  }

  /**
   * Create port forwarding rule
   */
  static async createPortForwardingRule(rule: any): Promise<any> {
    try {
      return { ...rule, id: `rule_${Date.now()}` };
    } catch (error) {
      console.error('Failed to create port forwarding rule:', error);
      throw new Error('Failed to create port forwarding rule');
    }
  }
}
