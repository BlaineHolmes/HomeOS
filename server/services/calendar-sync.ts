import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';
import { microsoftCalendarService, MicrosoftEvent } from './microsoft-calendar.js';
import { googleCalendarService, GoogleEvent } from './google-calendar.js';

// ============================================================================
// CALENDAR SYNC ENGINE - UNIFIED FAMILY CALENDAR
// ============================================================================

export interface CalendarAccount {
  id: string;
  user_id: string;
  provider: 'microsoft365' | 'google';
  account_email: string;
  account_name: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_id: string;
  calendar_name: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedEvent {
  id: string;
  external_id?: string;
  calendar_account_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string;
  recurrence_id?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  attendees?: any[];
  organizer?: any;
  created_by?: string;
  last_modified_by?: string;
  sync_status: 'synced' | 'pending' | 'conflict' | 'local_only';
  conflict_data?: any;
  created_at: string;
  updated_at: string;
  external_updated_at?: string;
}

export interface SyncResult {
  success: boolean;
  events_processed: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  conflicts_detected: number;
  errors: string[];
}

export class CalendarSyncService extends EventEmitter {
  private static instance: CalendarSyncService | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CalendarSyncService {
    if (!this.instance) {
      this.instance = new CalendarSyncService();
    }
    return this.instance;
  }

  /**
   * Start automatic calendar synchronization
   */
  startSync(): void {
    if (this.isSyncing) {
      console.log('⚠️  Calendar sync already running');
      return;
    }

    console.log('📅 Starting calendar synchronization...');
    this.isSyncing = true;

    // Sync every 15 minutes
    this.syncInterval = setInterval(async () => {
      await this.syncAllCalendars();
    }, 15 * 60 * 1000);

    // Initial sync
    this.syncAllCalendars();
  }

  /**
   * Stop automatic synchronization
   */
  stopSync(): void {
    if (!this.isSyncing) return;

    this.isSyncing = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('🛑 Calendar sync stopped');
  }

  /**
   * Sync all enabled calendar accounts
   */
  async syncAllCalendars(): Promise<void> {
    try {
      const accounts = await this.getEnabledCalendarAccounts();
      console.log(`📅 Syncing ${accounts.length} calendar accounts...`);

      for (const account of accounts) {
        try {
          await this.syncCalendarAccount(account);
        } catch (error: any) {
          console.error(`❌ Failed to sync calendar ${account.account_email}:`, error.message);
          await this.updateAccountSyncStatus(account.id, 'error', error.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Error during calendar sync:', error.message);
    }
  }

  /**
   * Sync a specific calendar account
   */
  async syncCalendarAccount(account: CalendarAccount): Promise<SyncResult> {
    const syncLogId = await this.createSyncLog(account.id, 'incremental', 'pull');
    
    try {
      await this.updateAccountSyncStatus(account.id, 'syncing');
      
      // Refresh token if needed
      const validToken = await this.ensureValidToken(account);
      
      let events: any[] = [];
      
      // Get events from external calendar
      if (account.provider === 'microsoft365') {
        events = await microsoftCalendarService.getEvents(
          validToken,
          account.calendar_id,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days ahead
        );
      } else if (account.provider === 'google') {
        events = await googleCalendarService.getEvents(
          validToken,
          account.calendar_id,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days ahead
        );
      }

      // Process and store events
      const result = await this.processEvents(account, events);
      
      // Update sync status
      await this.updateAccountSyncStatus(account.id, 'success');
      await this.updateSyncLog(syncLogId, 'success', result);
      
      this.emit('syncComplete', { account, result });
      
      return result;
    } catch (error: any) {
      await this.updateAccountSyncStatus(account.id, 'error', error.message);
      await this.updateSyncLog(syncLogId, 'error', undefined, error.message);
      throw error;
    }
  }

  /**
   * Process events from external calendar
   */
  private async processEvents(account: CalendarAccount, externalEvents: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      events_processed: externalEvents.length,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      conflicts_detected: 0,
      errors: [],
    };

    for (const externalEvent of externalEvents) {
      try {
        const unifiedEvent = this.convertToUnifiedEvent(account, externalEvent);
        
        // Check if event already exists
        const existingEvent = await this.getEventByExternalId(account.id, externalEvent.id);
        
        if (existingEvent) {
          // Check for conflicts
          if (this.hasConflict(existingEvent, unifiedEvent)) {
            await this.handleConflict(existingEvent, unifiedEvent);
            result.conflicts_detected++;
          } else {
            await this.updateEvent(unifiedEvent);
            result.events_updated++;
          }
        } else {
          await this.createEvent(unifiedEvent);
          result.events_created++;
        }
      } catch (error: any) {
        result.errors.push(`Failed to process event ${externalEvent.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Convert external event to unified format
   */
  private convertToUnifiedEvent(account: CalendarAccount, externalEvent: any): UnifiedEvent {
    const now = new Date().toISOString();
    
    if (account.provider === 'microsoft365') {
      const msEvent = externalEvent as MicrosoftEvent;
      return {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        external_id: msEvent.id,
        calendar_account_id: account.id,
        title: msEvent.subject || 'Untitled Event',
        description: msEvent.body?.content || '',
        location: msEvent.location?.displayName || '',
        start_time: msEvent.start.dateTime,
        end_time: msEvent.end.dateTime,
        all_day: msEvent.isAllDay,
        timezone: msEvent.start.timeZone || 'America/New_York',
        status: msEvent.isCancelled ? 'cancelled' : 'confirmed',
        visibility: 'public',
        attendees: msEvent.attendees || [],
        organizer: msEvent.organizer || null,
        sync_status: 'synced',
        created_at: now,
        updated_at: now,
        external_updated_at: msEvent.lastModifiedDateTime,
      };
    } else if (account.provider === 'google') {
      const gEvent = externalEvent as GoogleEvent;
      return {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        external_id: gEvent.id,
        calendar_account_id: account.id,
        title: gEvent.summary || 'Untitled Event',
        description: gEvent.description || '',
        location: gEvent.location || '',
        start_time: gEvent.start.dateTime || gEvent.start.date || '',
        end_time: gEvent.end.dateTime || gEvent.end.date || '',
        all_day: !!gEvent.start.date,
        timezone: gEvent.start.timeZone || 'America/New_York',
        status: gEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
        visibility: (gEvent.visibility as 'public' | 'private' | 'confidential') || 'public',
        attendees: gEvent.attendees || [],
        organizer: gEvent.organizer || null,
        sync_status: 'synced',
        created_at: now,
        updated_at: now,
        external_updated_at: gEvent.updated,
      };
    }

    throw new Error(`Unsupported provider: ${account.provider}`);
  }

  /**
   * Get enabled calendar accounts
   */
  private async getEnabledCalendarAccounts(): Promise<CalendarAccount[]> {
    return await DatabaseService.query(`
      SELECT * FROM calendar_accounts 
      WHERE sync_enabled = true
      ORDER BY created_at ASC
    `);
  }

  /**
   * Ensure access token is valid
   */
  private async ensureValidToken(account: CalendarAccount): Promise<string> {
    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();
    
    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log(`🔄 Refreshing token for ${account.account_email}`);
      
      let newTokens;
      if (account.provider === 'microsoft365') {
        newTokens = await microsoftCalendarService.refreshAccessToken(account.refresh_token);
      } else if (account.provider === 'google') {
        newTokens = await googleCalendarService.refreshAccessToken(account.refresh_token);
      } else {
        throw new Error(`Unsupported provider: ${account.provider}`);
      }
      
      // Update tokens in database
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      await DatabaseService.execute(`
        UPDATE calendar_accounts 
        SET access_token = ?, token_expires_at = ?, updated_at = ?
        WHERE id = ?
      `, [newTokens.access_token, newExpiresAt, new Date().toISOString(), account.id]);
      
      return newTokens.access_token;
    }
    
    return account.access_token;
  }

  /**
   * Update account sync status
   */
  private async updateAccountSyncStatus(
    accountId: string, 
    status: CalendarAccount['sync_status'], 
    error?: string
  ): Promise<void> {
    await DatabaseService.execute(`
      UPDATE calendar_accounts 
      SET sync_status = ?, sync_error = ?, last_sync_at = ?, updated_at = ?
      WHERE id = ?
    `, [
      status,
      error || null,
      new Date().toISOString(),
      new Date().toISOString(),
      accountId,
    ]);
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(
    accountId: string, 
    syncType: string, 
    syncDirection: string
  ): Promise<string> {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await DatabaseService.execute(`
      INSERT INTO calendar_sync_log (
        id, calendar_account_id, sync_type, sync_direction, 
        started_at, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      logId,
      accountId,
      syncType,
      syncDirection,
      new Date().toISOString(),
      'running',
    ]);
    
    return logId;
  }

  /**
   * Update sync log entry
   */
  private async updateSyncLog(
    logId: string, 
    status: string, 
    result?: SyncResult, 
    errorMessage?: string
  ): Promise<void> {
    await DatabaseService.execute(`
      UPDATE calendar_sync_log 
      SET status = ?, completed_at = ?, events_processed = ?, 
          events_created = ?, events_updated = ?, events_deleted = ?,
          conflicts_detected = ?, error_message = ?
      WHERE id = ?
    `, [
      status,
      new Date().toISOString(),
      result?.events_processed || 0,
      result?.events_created || 0,
      result?.events_updated || 0,
      result?.events_deleted || 0,
      result?.conflicts_detected || 0,
      errorMessage || null,
      logId,
    ]);
  }

  /**
   * Get event by external ID
   */
  private async getEventByExternalId(accountId: string, externalId: string): Promise<UnifiedEvent | null> {
    return await DatabaseService.queryOne(`
      SELECT * FROM calendar_events 
      WHERE calendar_account_id = ? AND external_id = ?
    `, [accountId, externalId]);
  }

  /**
   * Check for conflicts between local and external events
   */
  private hasConflict(localEvent: UnifiedEvent, externalEvent: UnifiedEvent): boolean {
    if (!localEvent.external_updated_at || !externalEvent.external_updated_at) {
      return false;
    }
    
    const localTime = new Date(localEvent.external_updated_at).getTime();
    const externalTime = new Date(externalEvent.external_updated_at).getTime();
    
    return externalTime > localTime && localEvent.updated_at > localEvent.external_updated_at;
  }

  /**
   * Handle conflict between local and external events
   */
  private async handleConflict(localEvent: UnifiedEvent, externalEvent: UnifiedEvent): Promise<void> {
    const conflictId = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await DatabaseService.execute(`
      INSERT INTO calendar_conflicts (
        id, event_id, calendar_account_id, conflict_type,
        local_data, remote_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      conflictId,
      localEvent.id,
      localEvent.calendar_account_id,
      'update',
      JSON.stringify(localEvent),
      JSON.stringify(externalEvent),
      new Date().toISOString(),
    ]);
    
    // For now, remote wins (can be made configurable)
    await this.updateEvent({ ...externalEvent, id: localEvent.id });
  }

  /**
   * Create new event
   */
  private async createEvent(event: UnifiedEvent): Promise<void> {
    await DatabaseService.execute(`
      INSERT INTO calendar_events (
        id, external_id, calendar_account_id, title, description, location,
        start_time, end_time, all_day, timezone, status, visibility,
        attendees, organizer, sync_status, created_at, updated_at, external_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event.id,
      event.external_id,
      event.calendar_account_id,
      event.title,
      event.description,
      event.location,
      event.start_time,
      event.end_time,
      event.all_day,
      event.timezone,
      event.status,
      event.visibility,
      JSON.stringify(event.attendees),
      JSON.stringify(event.organizer),
      event.sync_status,
      event.created_at,
      event.updated_at,
      event.external_updated_at,
    ]);
  }

  /**
   * Update existing event
   */
  private async updateEvent(event: UnifiedEvent): Promise<void> {
    await DatabaseService.execute(`
      UPDATE calendar_events 
      SET title = ?, description = ?, location = ?, start_time = ?, end_time = ?,
          all_day = ?, timezone = ?, status = ?, visibility = ?, attendees = ?,
          organizer = ?, sync_status = ?, updated_at = ?, external_updated_at = ?
      WHERE id = ?
    `, [
      event.title,
      event.description,
      event.location,
      event.start_time,
      event.end_time,
      event.all_day,
      event.timezone,
      event.status,
      event.visibility,
      JSON.stringify(event.attendees),
      JSON.stringify(event.organizer),
      event.sync_status,
      new Date().toISOString(),
      event.external_updated_at,
      event.id,
    ]);
  }
}

// Export singleton instance
export const calendarSyncService = CalendarSyncService.getInstance();
