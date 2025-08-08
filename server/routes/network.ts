import express from 'express';
import { NetworkService } from '../services/network.js';

const router = express.Router();

// ============================================================================
// NETWORK ROUTES - TP-LINK ER605 ROUTER MANAGEMENT
// ============================================================================

/**
 * GET /api/network/stats
 * Get router statistics and status
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await NetworkService.getRouterStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get network stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve network statistics',
    });
  }
});

/**
 * GET /api/network/devices
 * Get list of connected devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await NetworkService.getConnectedDevices();
    
    res.json({
      success: true,
      data: {
        devices,
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
      },
    });
  } catch (error) {
    console.error('Failed to get connected devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve connected devices',
    });
  }
});

/**
 * GET /api/network/security
 * Get security events and logs
 */
router.get('/security', async (req, res) => {
  try {
    const events = await NetworkService.getSecurityEvents();
    
    res.json({
      success: true,
      data: {
        events,
        total: events.length,
      },
    });
  } catch (error) {
    console.error('Failed to get security events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events',
    });
  }
});

/**
 * GET /api/network/bandwidth
 * Get bandwidth usage statistics
 */
router.get('/bandwidth', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    const bandwidth = await NetworkService.getBandwidthStats(timeframe as string);
    
    res.json({
      success: true,
      data: bandwidth,
    });
  } catch (error) {
    console.error('Failed to get bandwidth stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bandwidth statistics',
    });
  }
});

/**
 * POST /api/network/device/:deviceId/block
 * Block a specific device
 */
router.post('/device/:deviceId/block', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await NetworkService.blockDevice(deviceId);
    
    res.json({
      success: true,
      message: 'Device blocked successfully',
      data: result,
    });
  } catch (error) {
    console.error('Failed to block device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block device',
    });
  }
});

/**
 * POST /api/network/device/:deviceId/unblock
 * Unblock a specific device
 */
router.post('/device/:deviceId/unblock', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await NetworkService.unblockDevice(deviceId);
    
    res.json({
      success: true,
      message: 'Device unblocked successfully',
      data: result,
    });
  } catch (error) {
    console.error('Failed to unblock device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock device',
    });
  }
});

/**
 * POST /api/network/device/:deviceId/limit
 * Set bandwidth limit for a device
 */
router.post('/device/:deviceId/limit', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { uploadLimit, downloadLimit } = req.body;
    
    const result = await NetworkService.setBandwidthLimit(deviceId, {
      upload: uploadLimit,
      download: downloadLimit,
    });
    
    res.json({
      success: true,
      message: 'Bandwidth limit set successfully',
      data: result,
    });
  } catch (error) {
    console.error('Failed to set bandwidth limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set bandwidth limit',
    });
  }
});

/**
 * GET /api/network/wifi
 * Get WiFi network information
 */
router.get('/wifi', async (req, res) => {
  try {
    const wifiInfo = await NetworkService.getWiFiInfo();
    
    res.json({
      success: true,
      data: wifiInfo,
    });
  } catch (error) {
    console.error('Failed to get WiFi info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WiFi information',
    });
  }
});

/**
 * POST /api/network/wifi/restart
 * Restart WiFi radio
 */
router.post('/wifi/restart', async (req, res) => {
  try {
    const result = await NetworkService.restartWiFi();
    
    res.json({
      success: true,
      message: 'WiFi restart initiated',
      data: result,
    });
  } catch (error) {
    console.error('Failed to restart WiFi:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart WiFi',
    });
  }
});

/**
 * POST /api/network/reboot
 * Reboot the router
 */
router.post('/reboot', async (req, res) => {
  try {
    const result = await NetworkService.rebootRouter();
    
    res.json({
      success: true,
      message: 'Router reboot initiated',
      data: result,
    });
  } catch (error) {
    console.error('Failed to reboot router:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reboot router',
    });
  }
});

/**
 * GET /api/network/logs
 * Get router system logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { level = 'all', limit = 100 } = req.query;
    const logs = await NetworkService.getSystemLogs({
      level: level as string,
      limit: parseInt(limit as string),
    });
    
    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Failed to get system logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system logs',
    });
  }
});

/**
 * GET /api/network/port-forwarding
 * Get port forwarding rules
 */
router.get('/port-forwarding', async (req, res) => {
  try {
    const rules = await NetworkService.getPortForwardingRules();
    
    res.json({
      success: true,
      data: {
        rules,
        total: rules.length,
      },
    });
  } catch (error) {
    console.error('Failed to get port forwarding rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve port forwarding rules',
    });
  }
});

/**
 * POST /api/network/port-forwarding
 * Create new port forwarding rule
 */
router.post('/port-forwarding', async (req, res) => {
  try {
    const { name, protocol, externalPort, internalPort, internalIP, enabled } = req.body;
    
    const rule = await NetworkService.createPortForwardingRule({
      name,
      protocol,
      externalPort,
      internalPort,
      internalIP,
      enabled: enabled !== false,
    });
    
    res.json({
      success: true,
      message: 'Port forwarding rule created successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Failed to create port forwarding rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create port forwarding rule',
    });
  }
});

export default router;
