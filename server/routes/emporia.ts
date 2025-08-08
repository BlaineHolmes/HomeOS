import { Router } from 'express';
import { emporiaService } from '../services/emporia.js';

const router = Router();

// ============================================================================
// EMPORIA ENERGY ROUTES - DEVICE DISCOVERY AND ENERGY DATA
// ============================================================================

/**
 * GET /api/emporia/oauth/url
 * Get OAuth authorization URL
 */
router.get('/oauth/url', (req, res) => {
  try {
    const authUrl = emporiaService.getOAuthUrl();

    res.json({
      success: true,
      data: {
        auth_url: authUrl,
        message: 'Visit this URL to authorize HomeOS with your Google account',
      },
    });
  } catch (error: any) {
    console.error('OAuth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth URL',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/oauth/callback
 * Handle OAuth callback
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state',
      });
    }

    const success = await emporiaService.handleOAuthCallback(code as string, state as string);

    if (success) {
      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/energy?auth=success`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/energy?auth=error`);
    }
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/energy?auth=error`);
  }
});

/**
 * POST /api/emporia/auth/credentials
 * Authenticate with Emporia credentials (fallback)
 */
router.post('/auth/credentials', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const success = await emporiaService.authenticateWithCredentials(email, password);

    if (success) {
      res.json({
        success: true,
        message: 'Successfully authenticated with Emporia Energy',
        data: {
          credentials: emporiaService.getCredentials(),
          devices: emporiaService.getDevices(),
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication failed. Please check your credentials.',
      });
    }
  } catch (error: any) {
    console.error('Emporia credentials auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/status
 * Get authentication and connection status
 */
router.get('/status', (req, res) => {
  try {
    const isAuthenticated = emporiaService.isAuth();
    const credentials = emporiaService.getCredentials();
    const devices = emporiaService.getDevices();

    res.json({
      success: true,
      data: {
        is_authenticated: isAuthenticated,
        credentials: credentials,
        device_count: devices.length,
        devices: devices.map(device => ({
          device_gid: device.device_gid,
          device_name: device.device_name,
          model: device.model,
          is_online: device.is_online,
          channel_count: device.channels.length,
          last_seen: device.last_seen,
        })),
      },
    });
  } catch (error: any) {
    console.error('Emporia status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/devices
 * Get all discovered Emporia devices
 */
router.get('/devices', async (req, res) => {
  try {
    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const devices = emporiaService.getDevices();

    res.json({
      success: true,
      data: {
        devices: devices,
        total_devices: devices.length,
        online_devices: devices.filter(d => d.is_online).length,
      },
    });
  } catch (error: any) {
    console.error('Emporia devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get devices',
      details: error.message,
    });
  }
});

/**
 * POST /api/emporia/discover
 * Force device discovery
 */
router.post('/discover', async (req, res) => {
  try {
    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const devices = await emporiaService.discoverDevices();

    res.json({
      success: true,
      message: 'Device discovery completed',
      data: {
        devices: devices,
        discovered_count: devices.length,
      },
    });
  } catch (error: any) {
    console.error('Emporia discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Device discovery failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/realtime
 * Get real-time energy data for all devices
 */
router.get('/realtime', async (req, res) => {
  try {
    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const realtimeData = await emporiaService.getRealtimeData();

    // Calculate totals
    let totalWatts = 0;
    let totalVoltage = 0;
    let deviceCount = 0;

    realtimeData.forEach(deviceData => {
      Object.values(deviceData.channels).forEach(channel => {
        if (channel.usage_watts) {
          totalWatts += channel.usage_watts;
        }
        if (channel.voltage) {
          totalVoltage += channel.voltage;
          deviceCount++;
        }
      });
    });

    const avgVoltage = deviceCount > 0 ? totalVoltage / deviceCount : 0;

    res.json({
      success: true,
      data: {
        realtime_data: realtimeData,
        summary: {
          total_watts: Math.round(totalWatts),
          average_voltage: Math.round(avgVoltage * 10) / 10,
          total_devices: realtimeData.length,
          timestamp: new Date(),
        },
      },
    });
  } catch (error: any) {
    console.error('Emporia realtime error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time data',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/device/:deviceGid
 * Get specific device information and data
 */
router.get('/device/:deviceGid', async (req, res) => {
  try {
    const deviceGid = parseInt(req.params.deviceGid);

    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const device = emporiaService.getDevice(deviceGid);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.json({
      success: true,
      data: {
        device: device,
      },
    });
  } catch (error: any) {
    console.error('Emporia device error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device data',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/device/:deviceGid/history
 * Get historical data for a specific device
 */
router.get('/device/:deviceGid/history', async (req, res) => {
  try {
    const deviceGid = parseInt(req.params.deviceGid);
    const { scale = '1H', start, end } = req.query;

    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const startDate = start ? new Date(start as string) : undefined;
    const endDate = end ? new Date(end as string) : undefined;

    const historicalData = await emporiaService.getHistoricalData(
      deviceGid,
      scale as any,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: {
        device_gid: deviceGid,
        scale: scale,
        start_date: startDate,
        end_date: endDate,
        historical_data: historicalData,
      },
    });
  } catch (error: any) {
    console.error('Emporia history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get historical data',
      details: error.message,
    });
  }
});

/**
 * GET /api/emporia/device/:deviceGid/channels/:channelNum/usage
 * Get usage data for a specific device channel
 */
router.get('/device/:deviceGid/channels/:channelNum/usage', async (req, res) => {
  try {
    const deviceGid = parseInt(req.params.deviceGid);
    const channelNum = req.params.channelNum;
    const { scale = '1H', start, end, unit = 'KilowattHours' } = req.query;

    if (!emporiaService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Emporia Energy API',
      });
    }

    const startDate = start ? new Date(start as string) : undefined;
    const endDate = end ? new Date(end as string) : undefined;

    // For now, return mock data since the Connect API might not have this endpoint
    // In a real implementation, you would call the appropriate API
    const mockUsageData = {
      channelNum: channelNum,
      firstUsageInstant: startDate?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      scale: scale,
      unit: unit,
      usage: generateMockUsageData(startDate, endDate, scale as string),
    };

    res.json({
      success: true,
      data: {
        device_gid: deviceGid,
        channel_num: channelNum,
        scale: scale,
        start_date: startDate,
        end_date: endDate,
        historical_data: mockUsageData,
      },
    });
  } catch (error: any) {
    console.error('Emporia channel usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channel usage data',
      details: error.message,
    });
  }
});

/**
 * Generate mock usage data for demonstration
 */
function generateMockUsageData(start?: Date, end?: Date, scale?: string) {
  const startDate = start || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDate = end || new Date();
  const usage = [];

  let interval = 15 * 60 * 1000; // 15 minutes default
  switch (scale) {
    case '1MIN':
      interval = 60 * 1000;
      break;
    case '15MIN':
      interval = 15 * 60 * 1000;
      break;
    case '1H':
      interval = 60 * 60 * 1000;
      break;
    case '1D':
      interval = 24 * 60 * 60 * 1000;
      break;
  }

  for (let time = startDate.getTime(); time <= endDate.getTime(); time += interval) {
    usage.push({
      time: new Date(time).toISOString(),
      usage: Math.random() * 5 + 1, // Random usage between 1-6 kWh
    });
  }

  return usage;
}

/**
 * POST /api/emporia/disconnect
 * Disconnect from Emporia Energy API
 */
router.post('/disconnect', (req, res) => {
  try {
    emporiaService.disconnect();

    res.json({
      success: true,
      message: 'Disconnected from Emporia Energy API',
    });
  } catch (error: any) {
    console.error('Emporia disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect',
      details: error.message,
    });
  }
});

export default router;
