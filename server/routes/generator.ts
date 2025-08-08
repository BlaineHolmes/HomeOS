import { Router } from 'express';
import { generatorService } from '../services/generator.js';

const router = Router();

// ============================================================================
// GENERATOR ROUTES - REAL-TIME MONITORING & CONTROL
// ============================================================================

/**
 * GET /api/generator
 * Get current generator status
 */
router.get('/', async (req, res) => {
  try {
    const status = await generatorService.getStatus();
    const connectionStatus = generatorService.getConnectionStatus();

    res.json({
      success: true,
      data: {
        status,
        connection: connectionStatus,
        lastUpdated: status?.lastUpdated || null,
      },
    });
  } catch (error: any) {
    console.error('Generator status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generator status',
      details: error.message,
    });
  }
});

/**
 * GET /api/generator/status
 * Get current generator status (alias for root route)
 */
router.get('/status', async (req, res) => {
  try {
    const status = await generatorService.getStatus();
    const connectionStatus = generatorService.getConnectionStatus();

    res.json({
      success: true,
      data: {
        status,
        connection: connectionStatus,
        lastUpdated: status?.lastUpdated || null,
      },
    });
  } catch (error: any) {
    console.error('Generator status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generator status',
      details: error.message,
    });
  }
});

/**
 * GET /api/generator/config
 * Get generator configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = generatorService.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('Generator config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generator configuration',
      details: error.message,
    });
  }
});

/**
 * POST /api/generator/start
 * Start generator remotely
 */
router.post('/start', async (req, res) => {
  try {
    const result = await generatorService.startGenerator();

    res.json({
      success: true,
      message: 'Generator start command sent successfully',
      data: { started: result },
    });
  } catch (error: any) {
    console.error('Generator start error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to start generator',
      details: error.message,
    });
  }
});

/**
 * POST /api/generator/stop
 * Stop generator remotely
 */
router.post('/stop', async (req, res) => {
  try {
    const result = await generatorService.stopGenerator();

    res.json({
      success: true,
      message: 'Generator stop command sent successfully',
      data: { stopped: result },
    });
  } catch (error: any) {
    console.error('Generator stop error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to stop generator',
      details: error.message,
    });
  }
});

/**
 * GET /api/generator/test
 * Test generator connection
 */
router.get('/test', async (req, res) => {
  try {
    const result = await generatorService.testConnection();

    res.json({
      success: true,
      message: result ? 'Connection test successful' : 'Connection test failed',
      data: { connected: result },
    });
  } catch (error: any) {
    console.error('Generator test error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/generator/history
 * Get historical generator data
 */
router.get('/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const data = await generatorService.getHistoricalData(hours);

    res.json({
      success: true,
      data: {
        history: data,
        hours,
        count: data.length,
      },
    });
  } catch (error: any) {
    console.error('Generator history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get historical data',
      details: error.message,
    });
  }
});

export default router;
