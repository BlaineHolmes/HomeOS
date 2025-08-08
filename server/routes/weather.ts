import { Router } from 'express';
import { weatherMonitorService } from '../services/weather-service.js';

const router = Router();

// ============================================================================
// WEATHER ROUTES - REAL-TIME WEATHER & AUTOMATION
// ============================================================================

/**
 * GET /api/weather/current
 * Get current weather data
 */
router.get('/current', async (req, res) => {
  try {
    const weatherData = await weatherMonitorService.getCurrentWeather();

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data available',
      });
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error: any) {
    console.error('Current weather error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current weather',
      details: error.message,
    });
  }
});

/**
 * GET /api/weather/forecast
 * Get weather forecast
 */
router.get('/forecast', async (req, res) => {
  try {
    const weatherData = await weatherMonitorService.getCurrentWeather();

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data available',
      });
    }

    res.json({
      success: true,
      data: {
        forecast: weatherData.forecast,
        location: weatherData.location,
        last_updated: weatherData.last_updated,
      },
    });
  } catch (error: any) {
    console.error('Weather forecast error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weather forecast',
      details: error.message,
    });
  }
});

/**
 * GET /api/weather/alerts
 * Get weather alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const weatherData = await weatherMonitorService.getCurrentWeather();

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data available',
      });
    }

    res.json({
      success: true,
      data: {
        alerts: weatherData.alerts,
        count: weatherData.alerts.length,
      },
    });
  } catch (error: any) {
    console.error('Weather alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weather alerts',
      details: error.message,
    });
  }
});

/**
 * GET /api/weather/automation
 * Get weather automation status
 */
router.get('/automation', async (req, res) => {
  try {
    const weatherData = await weatherMonitorService.getCurrentWeather();

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data available',
      });
    }

    res.json({
      success: true,
      data: weatherData.automation,
    });
  } catch (error: any) {
    console.error('Weather automation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation status',
      details: error.message,
    });
  }
});

/**
 * POST /api/weather/location
 * Set weather monitoring location
 */
router.post('/location', async (req, res) => {
  try {
    const { latitude, longitude, name } = req.body;

    if (!latitude || !longitude || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: latitude, longitude, name',
      });
    }

    await weatherMonitorService.setLocation(latitude, longitude, name);

    res.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error: any) {
    console.error('Set location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set location',
      details: error.message,
    });
  }
});

/**
 * GET /api/weather/stats
 * Get weather statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const weatherData = await weatherMonitorService.getCurrentWeather();

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data available',
      });
    }

    const stats = {
      current_conditions: {
        temperature: weatherData.current.temperature,
        feels_like: weatherData.current.feels_like,
        condition: weatherData.current.condition,
        description: weatherData.current.description,
      },
      comfort_index: {
        humidity: weatherData.current.humidity,
        uv_index: weatherData.current.uv_index,
        visibility: weatherData.current.visibility,
      },
      wind_conditions: {
        speed: weatherData.current.wind_speed,
        direction: weatherData.current.wind_direction,
      },
      alerts: {
        active: weatherData.alerts.length,
        severe: weatherData.alerts.filter(a => a.severity === 'severe').length,
      },
      automation: weatherData.automation,
      last_updated: weatherData.last_updated,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Weather stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weather statistics',
      details: error.message,
    });
  }
});

export default router;
