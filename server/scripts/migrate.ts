import { DatabaseService } from '../services/database.js';

// ============================================================================
// DATABASE MIGRATION SCRIPT
// ============================================================================

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    await DatabaseService.initialize();

    // Create users table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        preferences TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create calendar_events table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        all_day INTEGER DEFAULT 0,
        location TEXT,
        color TEXT DEFAULT '#3b82f6',
        category TEXT DEFAULT 'personal',
        reminders TEXT DEFAULT '[]',
        recurrence TEXT,
        user_id TEXT NOT NULL,
        is_private INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create packages table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        vendor TEXT NOT NULL,
        courier TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ordered',
        estimated_delivery TEXT,
        delivered_at TEXT,
        user_id TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create chores table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS chores (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to TEXT NOT NULL,
        due_date TEXT,
        is_completed INTEGER DEFAULT 0,
        completed_at TEXT,
        completed_by TEXT,
        points INTEGER DEFAULT 0,
        category TEXT DEFAULT 'other',
        recurrence TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (completed_by) REFERENCES users (id)
      )
    `);

    // Add completed_by column if it doesn't exist (for existing databases)
    try {
      await DatabaseService.execute(`
        ALTER TABLE chores ADD COLUMN completed_by TEXT REFERENCES users(id)
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Create grocery_items table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS grocery_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'item',
        category TEXT DEFAULT 'other',
        is_completed INTEGER DEFAULT 0,
        added_by TEXT NOT NULL,
        completed_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (added_by) REFERENCES users (id),
        FOREIGN KEY (completed_by) REFERENCES users (id)
      )
    `);

    // Create generator_logs table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS generator_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        is_running INTEGER DEFAULT 0,
        is_loaded INTEGER DEFAULT 0,
        is_cooldown INTEGER DEFAULT 0,
        is_ready INTEGER DEFAULT 1,
        mains_available INTEGER DEFAULT 1,
        output_voltage REAL DEFAULT 0,
        frequency REAL DEFAULT 0,
        oil_temperature REAL DEFAULT 0,
        coolant_temperature REAL DEFAULT 0,
        rpm INTEGER DEFAULT 0,
        oil_pressure REAL DEFAULT 0,
        mains_voltage REAL DEFAULT 240,
        runtime REAL DEFAULT 0,
        fuel_level REAL
      )
    `);

    // Create energy_logs table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS energy_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        total_usage REAL DEFAULT 0,
        current_power REAL DEFAULT 0,
        voltage REAL DEFAULT 240,
        circuits TEXT DEFAULT '[]'
      )
    `);

    // Create system_settings table
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        timezone TEXT DEFAULT 'America/New_York',
        location TEXT DEFAULT '{}',
        weather_config TEXT DEFAULT '{}',
        generator_config TEXT DEFAULT '{}',
        email_config TEXT DEFAULT '{}',
        spotify_config TEXT DEFAULT '{}',
        updated_at TEXT NOT NULL
      )
    `);

    // Create emails table for email monitoring
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        message_id TEXT UNIQUE,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        body TEXT,
        html TEXT,
        parsed_type TEXT DEFAULT 'unknown',
        parsed_data TEXT DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);

    // Create package_events table for tracking history
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS package_events (
        id TEXT PRIMARY KEY,
        tracking_number TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        location TEXT,
        description TEXT,
        carrier TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create calendar_accounts table for external calendar connections
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS calendar_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'system',
        provider TEXT NOT NULL, -- 'microsoft365', 'google', 'outlook'
        account_email TEXT NOT NULL,
        account_name TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TEXT,
        calendar_id TEXT, -- External calendar ID
        calendar_name TEXT,
        sync_enabled BOOLEAN DEFAULT true,
        last_sync_at TEXT,
        sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
        sync_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create calendar_events table for unified event storage
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        external_id TEXT, -- ID from external calendar
        calendar_account_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        all_day BOOLEAN DEFAULT false,
        timezone TEXT DEFAULT 'America/New_York',
        recurrence_rule TEXT, -- RRULE for recurring events
        recurrence_id TEXT, -- For recurring event instances
        status TEXT DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
        visibility TEXT DEFAULT 'public', -- 'public', 'private', 'confidential'
        attendees TEXT, -- JSON array of attendees
        organizer TEXT, -- JSON object of organizer
        created_by TEXT,
        last_modified_by TEXT,
        sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'conflict', 'local_only'
        conflict_data TEXT, -- JSON data for conflict resolution
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        external_updated_at TEXT -- Last modified time from external calendar
      )
    `);

    // Create calendar_sync_log table for tracking sync operations
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS calendar_sync_log (
        id TEXT PRIMARY KEY,
        calendar_account_id TEXT NOT NULL,
        sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
        sync_direction TEXT NOT NULL, -- 'pull', 'push', 'bidirectional'
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL, -- 'running', 'success', 'error', 'cancelled'
        events_processed INTEGER DEFAULT 0,
        events_created INTEGER DEFAULT 0,
        events_updated INTEGER DEFAULT 0,
        events_deleted INTEGER DEFAULT 0,
        conflicts_detected INTEGER DEFAULT 0,
        error_message TEXT,
        sync_details TEXT -- JSON with detailed sync information
      )
    `);

    // Create calendar_conflicts table for conflict resolution
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS calendar_conflicts (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        calendar_account_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL, -- 'update', 'delete', 'duplicate'
        local_data TEXT NOT NULL, -- JSON of local event data
        remote_data TEXT NOT NULL, -- JSON of remote event data
        resolution_strategy TEXT, -- 'local_wins', 'remote_wins', 'merge', 'manual'
        resolved BOOLEAN DEFAULT false,
        resolved_at TEXT,
        resolved_by TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Create account_credentials table for unified account management
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS account_credentials (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL, -- 'microsoft365', 'google', 'spotify', etc.
        user_id TEXT NOT NULL DEFAULT 'system',
        account_name TEXT NOT NULL,
        account_email TEXT,
        credentials TEXT NOT NULL, -- Encrypted JSON of credentials
        status TEXT DEFAULT 'pending', -- 'pending', 'connected', 'error', 'expired'
        last_validated TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create energy monitoring tables
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS energy_readings (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        total_power REAL NOT NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        frequency REAL NOT NULL,
        power_factor REAL NOT NULL,
        daily_usage REAL NOT NULL,
        monthly_usage REAL NOT NULL,
        cost_today REAL NOT NULL,
        cost_month REAL NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS circuit_readings (
        id TEXT PRIMARY KEY,
        circuit_id TEXT NOT NULL,
        circuit_name TEXT NOT NULL,
        power REAL NOT NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        status TEXT NOT NULL,
        percentage REAL NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS energy_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        circuit_id TEXT,
        value REAL NOT NULL,
        threshold REAL NOT NULL,
        timestamp TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0
      )
    `);

    // Create weather monitoring tables
    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        temperature REAL NOT NULL,
        feels_like REAL NOT NULL,
        humidity INTEGER NOT NULL,
        pressure INTEGER NOT NULL,
        visibility REAL NOT NULL,
        uv_index INTEGER NOT NULL,
        wind_speed REAL NOT NULL,
        wind_direction INTEGER NOT NULL,
        condition TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS weather_alerts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await DatabaseService.execute(`
      CREATE TABLE IF NOT EXISTS automation_triggers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        condition TEXT NOT NULL,
        value REAL NOT NULL,
        operator TEXT NOT NULL,
        action TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        last_triggered TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default system settings if not exists
    const existingSettings = await DatabaseService.queryOne(
      'SELECT id FROM system_settings WHERE id = ?',
      ['main']
    );

    if (!existingSettings) {
      await DatabaseService.execute(`
        INSERT INTO system_settings (id, timezone, location, updated_at)
        VALUES (?, ?, ?, ?)
      `, [
        'main',
        process.env.TIMEZONE || 'America/New_York',
        JSON.stringify({
          latitude: parseFloat(process.env.LOCATION_LATITUDE || '40.7128'),
          longitude: parseFloat(process.env.LOCATION_LONGITUDE || '-74.0060'),
          city: process.env.LOCATION_CITY || 'New York',
          state: process.env.LOCATION_STATE || 'NY',
          country: process.env.LOCATION_COUNTRY || 'US',
        }),
        new Date().toISOString(),
      ]);
    }

    console.log('✅ Database migrations completed successfully');
    
    await DatabaseService.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
console.log('🚀 Starting migration script...');
runMigrations();
