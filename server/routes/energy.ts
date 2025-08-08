import { Router } from 'express';
import { energyMonitorService } from '../services/energy-monitor.js';

const router = Router();

// ============================================================================
// ENERGY MONITORING ROUTES - REAL-TIME POWER ANALYTICS
// ============================================================================

/**
 * GET /api/energy/current
 * Get current energy reading and circuit status
 */
router.get('/current', async (req, res) => {
  try {
    const [latestReading, circuitReadings] = await Promise.all([
      energyMonitorService.getLatestReading(),
      energyMonitorService.getLatestCircuitReadings(),
    ]);

    if (!latestReading) {
      return res.status(404).json({
        success: false,
        error: 'No energy readings available',
      });
    }

    res.json({
      success: true,
      data: {
        reading: latestReading,
        circuits: circuitReadings,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Current energy data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current energy data',
      details: error.message,
    });
  }
});

/**
 * GET /api/energy/history
 * Get energy usage history
 */
router.get('/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const history = await energyMonitorService.getUsageHistory(hours);

    res.json({
      success: true,
      data: {
        history,
        count: history.length,
        hours,
      },
    });
  } catch (error: any) {
    console.error('Energy history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy history',
      details: error.message,
    });
  }
});

/**
 * GET /api/energy/alerts
 * Get active energy alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await energyMonitorService.getActiveAlerts();

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
    });
  } catch (error: any) {
    console.error('Energy alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/energy/alerts/:id/acknowledge
 * Acknowledge an energy alert
 */
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await energyMonitorService.acknowledgeAlert(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      details: error.message,
    });
  }
});

/**
 * GET /api/energy/stats
 * Get energy statistics and summary
 */
router.get('/stats', async (req, res) => {
  try {
    const [latestReading, alerts, history] = await Promise.all([
      energyMonitorService.getLatestReading(),
      energyMonitorService.getActiveAlerts(),
      energyMonitorService.getUsageHistory(24),
    ]);

    if (!latestReading) {
      return res.status(404).json({
        success: false,
        error: 'No energy data available',
      });
    }

    // Calculate statistics
    const avgPower = history.length > 0
      ? history.reduce((sum, reading) => sum + reading.total_power, 0) / history.length
      : latestReading.total_power;

    const peakPower = history.length > 0
      ? Math.max(...history.map(reading => reading.total_power))
      : latestReading.total_power;

    const minPower = history.length > 0
      ? Math.min(...history.map(reading => reading.total_power))
      : latestReading.total_power;

    const stats = {
      current: {
        power: latestReading.total_power,
        voltage: latestReading.voltage,
        current: latestReading.current,
        frequency: latestReading.frequency,
        power_factor: latestReading.power_factor,
      },
      usage: {
        daily: latestReading.daily_usage,
        monthly: latestReading.monthly_usage,
        avg_power_24h: avgPower,
        peak_power_24h: peakPower,
        min_power_24h: minPower,
      },
      costs: {
        today: latestReading.cost_today,
        month: latestReading.cost_month,
        rate: 0.12, // $0.12 per kWh
      },
      alerts: {
        active: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
      },
      system: {
        monitoring: true,
        last_reading: latestReading.timestamp,
        data_points_24h: history.length,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Energy stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy statistics',
      details: error.message,
    });
  }
});

/**
 * GET /api/energy/circuits
 * Get detailed circuit information
 */
router.get('/circuits', async (req, res) => {
  try {
    const circuits = await energyMonitorService.getLatestCircuitReadings();

    res.json({
      success: true,
      data: {
        circuits,
        count: circuits.length,
      },
    });
  } catch (error: any) {
    console.error('Energy circuits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit data',
      details: error.message,
    });
  }
});

export default router;
