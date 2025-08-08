import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

// ============================================================================
// DATABASE SERVICE - SUPPORTS BOTH POSTGRESQL AND SQLITE
// ============================================================================

export class DatabaseService {
  private static sqliteDb: Database | null = null;

  /**
   * Initialize database connection
   * Uses SQLite for offline operation
   */
  static async initialize(): Promise<void> {
    // Use SQLite for offline operation
    await this.initializeSQLite();
    console.log('✅ Connected to SQLite database (offline mode)');
  }



  /**
   * Initialize SQLite connection
   */
  private static async initializeSQLite(): Promise<void> {
    const dbPath = path.join(process.cwd(), 'data', 'homeos.db');
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    this.sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await this.sqliteDb.exec('PRAGMA foreign_keys = ON');
  }

  /**
   * Get database connection
   */
  static async getConnection(): Promise<Database> {
    if (this.sqliteDb) {
      return this.sqliteDb;
    } else {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Execute a query
   */
  static async query(sql: string, params: any[] = []): Promise<any> {
    if (this.sqliteDb) {
      return await this.sqliteDb.all(sql, params);
    } else {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Execute a single query and return first row
   */
  static async queryOne(sql: string, params: any[] = []): Promise<any> {
    if (this.sqliteDb) {
      return await this.sqliteDb.get(sql, params);
    } else {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Execute an insert/update/delete query
   */
  static async execute(sql: string, params: any[] = []): Promise<any> {
    if (this.sqliteDb) {
      return await this.sqliteDb.run(sql, params);
    } else {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Begin transaction
   */
  static async beginTransaction(): Promise<Database> {
    if (this.sqliteDb) {
      await this.sqliteDb.exec('BEGIN TRANSACTION');
      return this.sqliteDb;
    } else {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Commit transaction
   */
  static async commitTransaction(connection: Database): Promise<void> {
    await connection.exec('COMMIT');
  }

  /**
   * Rollback transaction
   */
  static async rollbackTransaction(connection: Database): Promise<void> {
    await connection.exec('ROLLBACK');
  }

  /**
   * Close database connections
   */
  static async close(): Promise<void> {
    if (this.sqliteDb) {
      await this.sqliteDb.close();
      this.sqliteDb = null;
    }
  }
}
