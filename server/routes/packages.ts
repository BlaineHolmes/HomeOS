import { Router } from 'express';
import { packageTrackingService } from '../services/package-tracking.js';
import { emailService } from '../services/email.js';
import { DatabaseService } from '../services/database.js';

const router = Router();

// ============================================================================
// PACKAGE ROUTES - TRACKING AND MANAGEMENT
// ============================================================================

/**
 * GET /api/packages
 * Get all packages for the current user
 */
router.get('/', async (req, res) => {
  try {
    // TODO: Get user ID from authentication
    const userId = req.query.userId as string || 'system';

    const packages = await packageTrackingService.getUserPackages(userId);

    res.json({
      success: true,
      data: {
        packages,
        count: packages.length,
      },
    });
  } catch (error: any) {
    console.error('Packages list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get packages',
      details: error.message,
    });
  }
});

/**
 * GET /api/packages/:trackingNumber
 * Get detailed tracking information for a specific package
 */
router.get('/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const packageStatus = await packageTrackingService.getPackageStatus(trackingNumber);

    if (!packageStatus) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    res.json({
      success: true,
      data: packageStatus,
    });
  } catch (error: any) {
    console.error('Package details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get package details',
      details: error.message,
    });
  }
});

/**
 * POST /api/packages/:trackingNumber/update
 * Force update tracking information for a package
 */
router.post('/:trackingNumber/update', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrier } = req.body;

    if (!carrier) {
      return res.status(400).json({
        success: false,
        error: 'Carrier is required',
      });
    }

    const status = await packageTrackingService.updatePackageStatus(trackingNumber, carrier);

    res.json({
      success: true,
      message: 'Package update requested',
      data: status,
    });
  } catch (error: any) {
    console.error('Package update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update package',
      details: error.message,
    });
  }
});

/**
 * POST /api/packages
 * Manually add a package for tracking
 */
router.post('/', async (req, res) => {
  try {
    const { trackingNumber, carrier, vendor, description, userId } = req.body;

    if (!trackingNumber || !carrier) {
      return res.status(400).json({
        success: false,
        error: 'Tracking number and carrier are required',
      });
    }

    // Create package entry
    const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await DatabaseService.execute(`
      INSERT INTO packages (
        id, vendor, courier, tracking_number, description, status,
        user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      packageId,
      vendor || 'Unknown',
      carrier,
      trackingNumber,
      description || 'Package',
      'processing',
      userId || 'system',
      now,
      now,
    ]);

    // Trigger initial tracking update
    const status = await packageTrackingService.updatePackageStatus(trackingNumber, carrier);

    res.status(201).json({
      success: true,
      message: 'Package added successfully',
      data: {
        id: packageId,
        trackingNumber,
        carrier,
        status,
      },
    });
  } catch (error: any) {
    console.error('Add package error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add package',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/packages/:trackingNumber
 * Remove a package from tracking
 */
router.delete('/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    await DatabaseService.execute(`
      DELETE FROM packages WHERE tracking_number = ?
    `, [trackingNumber]);

    await DatabaseService.execute(`
      DELETE FROM package_events WHERE tracking_number = ?
    `, [trackingNumber]);

    res.json({
      success: true,
      message: 'Package removed successfully',
    });
  } catch (error: any) {
    console.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete package',
      details: error.message,
    });
  }
});

/**
 * GET /api/packages/emails/recent
 * Get recent package-related emails
 */
router.get('/emails/recent', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const emails = await emailService.getRecentPackageEmails(days);

    res.json({
      success: true,
      data: {
        emails,
        count: emails.length,
        days,
      },
    });
  } catch (error: any) {
    console.error('Package emails error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get package emails',
      details: error.message,
    });
  }
});

/**
 * GET /api/packages/stats
 * Get package tracking statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await DatabaseService.query(`
      SELECT
        status,
        COUNT(*) as count,
        courier
      FROM packages
      GROUP BY status, courier
      ORDER BY count DESC
    `);

    const totalPackages = await DatabaseService.queryOne(`
      SELECT COUNT(*) as total FROM packages
    `);

    const recentDeliveries = await DatabaseService.query(`
      SELECT COUNT(*) as count FROM packages
      WHERE status = 'delivered'
      AND delivered_at >= date('now', '-7 days')
    `);

    res.json({
      success: true,
      data: {
        statusBreakdown: stats,
        totalPackages: totalPackages.total,
        recentDeliveries: recentDeliveries[0]?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Package stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get package statistics',
      details: error.message,
    });
  }
});

export default router;
