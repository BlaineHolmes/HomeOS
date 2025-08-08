import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

// ============================================================================
// EMPORIA CONNECT API SERVICE - DEVICE DISCOVERY & ENERGY DATA
// ============================================================================

interface EmporiaCustomer {
  customerGid: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

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

interface EmporiaUsageData {
  channelNum: string;
  firstUsageInstant: string;
  scale: string;
  unit: string;
  usage: Array<{
    time: string;
    usage: number;
  }>;
}

interface EmporiaCredentials {
  email: string;
  access_token?: string;
  refresh_token?: string;
  token_expires?: Date;
  customer?: EmporiaCustomer;
  isAuthenticated: boolean;
}

class EmporiaService extends EventEmitter {
  private credentials: EmporiaCredentials | null = null;
  private apiClient: AxiosInstance;
  private devices: Map<number, EmporiaDevice> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  private oauthState: string | null = null;

  constructor() {
    super();

    // Initialize API client for Emporia Connect
    this.apiClient = axios.create({
      baseURL: 'https://emporia-connect.xyt.co.za/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HomeOS/1.0.0',
      },
    });

    // Add request interceptor for OAuth token
    this.apiClient.interceptors.request.use(async (config) => {
      if (this.credentials?.access_token) {
        config.headers.Authorization = `Bearer ${this.credentials.access_token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.error('Emporia authentication failed');
          this.credentials = null;
          this.emit('auth_error', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate OAuth authorization URL for Emporia
   */
  getOAuthUrl(): string {
    const clientId = process.env.EMPORIA_CLIENT_ID || 'your-client-id';
    const redirectUri = encodeURIComponent(process.env.EMPORIA_REDIRECT_URI || 'http://localhost:3001/api/emporia/oauth/callback');
    const scope = encodeURIComponent('openid email profile');
    const state = Math.random().toString(36).substring(2, 15);

    // Store state for validation
    this.oauthState = state;

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
           `client_id=${clientId}&` +
           `redirect_uri=${redirectUri}&` +
           `response_type=code&` +
           `scope=${scope}&` +
           `state=${state}&` +
           `access_type=offline&` +
           `prompt=consent`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, state: string): Promise<boolean> {
    try {
      if (state !== this.oauthState) {
        throw new Error('Invalid OAuth state parameter');
      }

      console.log('🔐 Exchanging OAuth code for tokens...');

      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.EMPORIA_CLIENT_ID,
        client_secret: process.env.EMPORIA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.EMPORIA_REDIRECT_URI || 'http://localhost:3001/api/emporia/oauth/callback',
      });

      if (tokenResponse.data.access_token) {
        // Get user info from Google
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        });

        this.credentials = {
          email: userResponse.data.email,
          access_token: tokenResponse.data.access_token,
          refresh_token: tokenResponse.data.refresh_token,
          token_expires: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
          isAuthenticated: true,
        };

        console.log('✅ OAuth authentication successful');
        console.log(`👤 Authenticated as ${userResponse.data.email}`);

        // Now try to authenticate with Emporia using the OAuth token
        await this.authenticateWithEmporia();

        this.emit('authenticated', this.credentials);
        return true;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error: any) {
      console.error('❌ OAuth authentication failed:', error.message);
      this.credentials = null;
      this.emit('auth_error', error);
      return false;
    }
  }

  /**
   * Authenticate with Emporia using OAuth token
   */
  private async authenticateWithEmporia(): Promise<void> {
    try {
      // Try the official Emporia API first
      const emporiaApiClient = axios.create({
        baseURL: 'https://api.emporiaenergy.com',
        headers: {
          'Authorization': `Bearer ${this.credentials?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await emporiaApiClient.get('/customers/profile');

      if (response.data) {
        this.credentials!.customer = {
          customerGid: response.data.customerGid,
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          createdAt: response.data.createdAt,
        };

        // Update API client to use official Emporia API
        this.apiClient.defaults.baseURL = 'https://api.emporiaenergy.com';

        console.log('✅ Connected to official Emporia API');
      }
    } catch (error) {
      console.log('⚠️ Official Emporia API not accessible, trying alternative methods...');

      // Fallback: Try to use the Connect API with email/password if available
      // This would require the user to provide their Emporia credentials separately
      console.log('💡 Please provide your Emporia credentials for direct API access');
    }

    // Start services regardless
    await this.startServices();
  }

  /**
   * Authenticate with email/password (fallback method)
   */
  async authenticateWithCredentials(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Authenticating with Emporia credentials...');

      // Try the Connect API with basic auth
      const connectClient = axios.create({
        baseURL: 'https://emporia-connect.xyt.co.za/api',
        auth: {
          username: email,
          password: password,
        },
      });

      const response = await connectClient.get('/customer');

      if (response.data) {
        this.credentials = {
          email: email,
          customer: response.data,
          isAuthenticated: true,
        };

        // Update API client to use Connect API
        this.apiClient.defaults.baseURL = 'https://emporia-connect.xyt.co.za/api';
        this.apiClient.defaults.auth = { username: email, password: password };

        console.log('✅ Connected to Emporia Connect API');
        console.log(`👤 Welcome ${response.data.firstName} ${response.data.lastName}`);

        await this.startServices();
        this.emit('authenticated', this.credentials);
        return true;
      } else {
        throw new Error('Invalid response from Emporia Connect API');
      }
    } catch (error: any) {
      console.error('❌ Emporia credentials authentication failed:', error.message);
      this.emit('auth_error', error);
      return false;
    }
  }

  /**
   * Discover Emporia devices
   */
  async discoverDevices(): Promise<EmporiaDevice[]> {
    try {
      if (!this.credentials?.isAuthenticated) {
        throw new Error('Not authenticated with Emporia Connect API');
      }

      console.log('🔍 Discovering Emporia devices...');

      const response = await this.apiClient.get('/devices');

      if (Array.isArray(response.data)) {
        const devices: EmporiaDevice[] = response.data;

        // Get channels for each device
        for (const device of devices) {
          try {
            const channelsResponse = await this.apiClient.get(`/devices/${device.deviceGid}/channels`);
            if (Array.isArray(channelsResponse.data)) {
              device.parsedChannels = channelsResponse.data;
            }
          } catch (channelError) {
            console.warn(`Failed to get channels for device ${device.deviceGid}:`, channelError);
            device.parsedChannels = [];
          }
        }

        // Update devices map
        devices.forEach(device => {
          this.devices.set(device.deviceGid, device);
        });

        console.log(`✅ Found ${devices.length} Emporia devices`);
        this.emit('devices_discovered', devices);

        return devices;
      } else {
        console.log('⚠️ No devices found in Emporia account');
        return [];
      }
    } catch (error: any) {
      console.error('❌ Device discovery failed:', error.message);
      this.emit('discovery_error', error);
      return [];
    }
  }

  /**
   * Get real-time usage data for all devices
   */
  async getRealtimeData(): Promise<EmporiaRealtimeData[]> {
    try {
      if (!this.isAuthenticated || this.devices.size === 0) {
        return [];
      }

      const realtimeData: EmporiaRealtimeData[] = [];
      
      for (const [deviceGid, device] of this.devices) {
        try {
          const response = await this.apiClient.get(`/AppAPI?apiMethod=getDeviceListUsages&deviceGids=${deviceGid}&instant=1&scale=1S&energyUnit=KilowattHours`);
          
          if (response.data?.deviceListUsages?.[0]) {
            const usage = response.data.deviceListUsages[0];
            const channels: { [key: number]: any } = {};
            
            usage.channelUsages?.forEach((channelUsage: any) => {
              channels[channelUsage.channel] = {
                usage_watts: channelUsage.usage || 0,
                voltage: channelUsage.voltage || 0,
                current_amps: channelUsage.usage && channelUsage.voltage ? 
                  (channelUsage.usage / channelUsage.voltage) : 0,
                power_factor: channelUsage.powerFactor || 1.0,
                frequency: 60, // Default to 60Hz
              };

              // Update device channel data
              const deviceChannel = device.channels.find(c => c.channel_num === channelUsage.channel);
              if (deviceChannel) {
                deviceChannel.usage_watts = channelUsage.usage || 0;
                deviceChannel.voltage = channelUsage.voltage || 0;
                deviceChannel.current_amps = channels[channelUsage.channel].current_amps;
                deviceChannel.power_factor = channelUsage.powerFactor || 1.0;
              }
            });

            realtimeData.push({
              device_gid: deviceGid,
              timestamp: new Date(),
              channels,
            });
          }
        } catch (deviceError) {
          console.error(`Error getting data for device ${deviceGid}:`, deviceError);
        }
      }

      this.emit('realtime_data', realtimeData);
      return realtimeData;
    } catch (error: any) {
      console.error('❌ Failed to get realtime data:', error.message);
      this.emit('data_error', error);
      return [];
    }
  }

  /**
   * Get historical usage data
   */
  async getHistoricalData(deviceGid: number, scale: '1MIN' | '15MIN' | '1H' | '1D' | '1MON' = '1H', start?: Date, end?: Date): Promise<any> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const startTime = start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago
      const endTime = end || new Date();

      const response = await this.apiClient.get(`/AppAPI?apiMethod=getChartUsage&deviceGid=${deviceGid}&channel=1,2,3&start=${startTime.toISOString()}&end=${endTime.toISOString()}&scale=${scale}&energyUnit=KilowattHours`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get historical data:', error.message);
      throw error;
    }
  }

  /**
   * Start background services
   */
  private async startServices(): Promise<void> {
    // Initial device discovery
    await this.discoverDevices();

    // Set up periodic device discovery (every 5 minutes)
    this.discoveryInterval = setInterval(async () => {
      await this.discoverDevices();
    }, 5 * 60 * 1000);

    // Set up real-time data polling (every 10 seconds)
    this.refreshInterval = setInterval(async () => {
      await this.getRealtimeData();
    }, 10 * 1000);

    console.log('🚀 Emporia background services started');
  }

  /**
   * Stop background services
   */
  stopServices(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    console.log('🛑 Emporia background services stopped');
  }

  /**
   * Get current devices
   */
  getDevices(): EmporiaDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get device by ID
   */
  getDevice(deviceGid: number): EmporiaDevice | undefined {
    return this.devices.get(deviceGid);
  }

  /**
   * Check if service is authenticated
   */
  isAuth(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get current credentials (without sensitive data)
   */
  getCredentials(): Partial<EmporiaCredentials> | null {
    if (!this.credentials) return null;
    
    return {
      username: this.credentials.username,
      customer_id: this.credentials.customer_id,
      token_expires: this.credentials.token_expires,
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopServices();
    this.credentials = null;
    this.isAuthenticated = false;
    this.devices.clear();
    this.emit('disconnected');
    console.log('🔌 Disconnected from Emporia Energy API');
  }
}

// Export singleton instance
export const emporiaService = new EmporiaService();
export default EmporiaService;
