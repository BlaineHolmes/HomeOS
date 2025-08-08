import { DatabaseService } from '../services/database.js';

async function dropPackageTables() {
  try {
    console.log('🔄 Dropping package tables...');
    await DatabaseService.initialize();
    
    await DatabaseService.execute('DROP TABLE IF EXISTS package_events');
    await DatabaseService.execute('DROP TABLE IF EXISTS packages');
    
    console.log('✅ Package tables dropped successfully');
    await DatabaseService.close();
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    process.exit(1);
  }
}

dropPackageTables();
