import { Router } from 'express';

const router = Router();

// GET /api/settings
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Settings endpoint - Coming soon',
    data: {
      timezone: process.env.TIMEZONE || 'America/New_York',
      location: {
        latitude: parseFloat(process.env.LOCATION_LATITUDE || '40.7128'),
        longitude: parseFloat(process.env.LOCATION_LONGITUDE || '-74.0060'),
        city: process.env.LOCATION_CITY || 'New York',
        state: process.env.LOCATION_STATE || 'NY',
        country: process.env.LOCATION_COUNTRY || 'US',
      },
    },
  });
});

export default router;
