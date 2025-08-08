import { Router } from 'express';
import { calendarSyncService } from '../services/calendar-sync.js';
import { microsoftCalendarService } from '../services/microsoft-calendar.js';
import { googleCalendarService } from '../services/google-calendar.js';
import { DatabaseService } from '../services/database.js';

const router = Router();

// ============================================================================
// CALENDAR ROUTES - UNIFIED FAMILY CALENDAR MANAGEMENT
// ============================================================================

/**
 * GET /api/calendar/accounts
 * Get all connected calendar accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await DatabaseService.query(`
      SELECT id, user_id, provider, account_email, account_name,
             calendar_name, sync_enabled, last_sync_at, sync_status,
             sync_error, created_at, updated_at
      FROM calendar_accounts
      ORDER BY created_at ASC
    `);

    res.json({
      success: true,
      data: {
        accounts,
        count: accounts.length,
      },
    });
  } catch (error: any) {
    console.error('Calendar accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar accounts',
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/events
 * Get unified calendar events
 */
router.get('/events', async (req, res) => {
  try {
    const { start, end, calendar_id } = req.query;

    let query = `
      SELECT e.*, a.account_name, a.provider, a.account_email
      FROM calendar_events e
      JOIN calendar_accounts a ON e.calendar_account_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start) {
      query += ` AND e.start_time >= ?`;
      params.push(start);
    }

    if (end) {
      query += ` AND e.end_time <= ?`;
      params.push(end);
    }

    if (calendar_id) {
      query += ` AND e.calendar_account_id = ?`;
      params.push(calendar_id);
    }

    query += ` ORDER BY e.start_time ASC`;

    const events = await DatabaseService.query(query, params);

    // Parse JSON fields
    const processedEvents = events.map(event => ({
      ...event,
      attendees: event.attendees ? JSON.parse(event.attendees) : [],
      organizer: event.organizer ? JSON.parse(event.organizer) : null,
      conflict_data: event.conflict_data ? JSON.parse(event.conflict_data) : null,
    }));

    res.json({
      success: true,
      data: {
        events: processedEvents,
        count: processedEvents.length,
      },
    });
  } catch (error: any) {
    console.error('Calendar events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar events',
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/sync
 * Trigger manual calendar synchronization
 */
router.post('/sync', async (req, res) => {
  try {
    const { account_id } = req.body;

    if (account_id) {
      // Sync specific account
      const account = await DatabaseService.queryOne(`
        SELECT * FROM calendar_accounts WHERE id = ?
      `, [account_id]);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Calendar account not found',
        });
      }

      const result = await calendarSyncService.syncCalendarAccount(account);

      res.json({
        success: true,
        message: 'Calendar sync completed',
        data: result,
      });
    } else {
      // Sync all accounts
      await calendarSyncService.syncAllCalendars();

      res.json({
        success: true,
        message: 'All calendars sync initiated',
      });
    }
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendars',
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/auth/microsoft
 * Get Microsoft 365 OAuth URL
 */
router.get('/auth/microsoft', (req, res) => {
  try {
    const authUrl = microsoftCalendarService.getAuthUrl('microsoft365_calendar');

    res.json({
      success: true,
      data: {
        authUrl,
        provider: 'microsoft365',
      },
    });
  } catch (error: any) {
    console.error('Microsoft auth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Microsoft auth URL',
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/auth/google
 * Get Google Calendar OAuth URL
 */
router.get('/auth/google', (req, res) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl('google_calendar');

    res.json({
      success: true,
      data: {
        authUrl,
        provider: 'google',
      },
    });
  } catch (error: any) {
    console.error('Google auth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Google auth URL',
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/auth/callback
 * Handle OAuth callback for both providers
 */
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state, provider } = req.body;

    if (!code || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or provider',
      });
    }

    let tokens, userProfile, calendars;

    if (provider === 'microsoft365') {
      tokens = await microsoftCalendarService.exchangeCodeForTokens(code);
      userProfile = await microsoftCalendarService.getUserProfile(tokens.access_token);
      calendars = await microsoftCalendarService.getCalendars(tokens.access_token);
    } else if (provider === 'google') {
      tokens = await googleCalendarService.exchangeCodeForTokens(code);
      userProfile = await googleCalendarService.getUserProfile(tokens.access_token);
      calendars = await googleCalendarService.getCalendars(tokens.access_token);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported provider',
      });
    }

    // Store calendar accounts
    const accountIds = [];
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    for (const calendar of calendars) {
      const accountId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await DatabaseService.execute(`
        INSERT INTO calendar_accounts (
          id, user_id, provider, account_email, account_name,
          access_token, refresh_token, token_expires_at,
          calendar_id, calendar_name, sync_enabled,
          sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        accountId,
        'system', // TODO: Get from authenticated user
        provider,
        userProfile.email || userProfile.mail || userProfile.userPrincipalName,
        userProfile.displayName || userProfile.name,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt,
        calendar.id,
        calendar.name || calendar.summary,
        true,
        'pending',
        now,
        now,
      ]);

      accountIds.push(accountId);
    }

    // Trigger initial sync
    setTimeout(() => {
      calendarSyncService.syncAllCalendars();
    }, 1000);

    res.json({
      success: true,
      message: 'Calendar accounts connected successfully',
      data: {
        provider,
        accountsCreated: accountIds.length,
        userProfile: {
          email: userProfile.email || userProfile.mail || userProfile.userPrincipalName,
          name: userProfile.displayName || userProfile.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Calendar auth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process calendar authentication',
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/stats
 * Get calendar statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await DatabaseService.query(`
      SELECT
        provider,
        COUNT(*) as account_count,
        SUM(CASE WHEN sync_enabled = 1 THEN 1 ELSE 0 END) as enabled_count
      FROM calendar_accounts
      GROUP BY provider
    `);

    const eventStats = await DatabaseService.queryOne(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_time >= date('now') THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN sync_status = 'conflict' THEN 1 END) as conflicts
      FROM calendar_events
    `);

    const recentSync = await DatabaseService.queryOne(`
      SELECT MAX(last_sync_at) as last_sync
      FROM calendar_accounts
      WHERE last_sync_at IS NOT NULL
    `);

    res.json({
      success: true,
      data: {
        providers: stats,
        events: eventStats,
        lastSync: recentSync.last_sync,
      },
    });
  } catch (error: any) {
    console.error('Calendar stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar statistics',
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post('/events', async (req, res) => {
  try {
    const { title, description, start_time, end_time, all_day, location, account_id } = req.body;

    if (!title || !start_time || !end_time || !account_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, start_time, end_time, account_id',
      });
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date().toISOString();

    await DatabaseService.execute(`
      INSERT INTO calendar_events (
        id, title, description, start_time, end_time, all_day,
        location, calendar_account_id, calendar_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventId,
      title,
      description || null,
      start_time,
      end_time,
      all_day ? 1 : 0,
      location || null,
      account_id,
      'local', // Default calendar ID
      now,
      now,
    ]);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        eventId,
        title,
        start_time,
        end_time,
      },
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      details: error.message,
    });
  }
});

/**
 * PUT /api/calendar/events/:id
 * Update a calendar event
 */
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_time, end_time, all_day, location, account_id } = req.body;

    if (!title || !start_time || !end_time || !account_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, start_time, end_time, account_id',
      });
    }

    const now = new Date().toISOString();

    const result = await DatabaseService.execute(`
      UPDATE calendar_events
      SET title = ?, description = ?, start_time = ?, end_time = ?,
          all_day = ?, location = ?, calendar_account_id = ?, updated_at = ?
      WHERE id = ?
    `, [
      title,
      description || null,
      start_time,
      end_time,
      all_day ? 1 : 0,
      location || null,
      account_id,
      now,
      id,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        eventId: id,
        title,
        start_time,
        end_time,
      },
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete a calendar event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await DatabaseService.execute(`
      DELETE FROM calendar_events WHERE id = ?
    `, [id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      details: error.message,
    });
  }
});

export default router;
