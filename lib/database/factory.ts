import 'server-only';

import { DatabaseAdapter } from './adapter';
import { SQLiteAdapter } from './sqlite-adapter';
import { PostgreSQLAdapter } from './postgresql-adapter';
import { appConfig, isSaaSMode } from '@/lib/config';

let adapterInstance: DatabaseAdapter | null = null;

/**
 * Database Factory
 * Creates the appropriate database adapter based on deployment mode
 */
export function createDatabaseAdapter(): DatabaseAdapter {
  if (isSaaSMode()) {
    // SaaS mode - use PostgreSQL
    if (!appConfig.database.postgresUrl) {
      throw new Error('DATABASE_URL is required for SaaS mode');
    }
    return new PostgreSQLAdapter(appConfig.database.postgresUrl);
  } else {
    // Self-hosted mode - use SQLite
    return new SQLiteAdapter();
  }
}

/**
 * Get singleton database adapter instance
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  if (!adapterInstance) {
    adapterInstance = createDatabaseAdapter();
  }
  return adapterInstance;
}

/**
 * Reset the adapter instance (useful for testing)
 */
export function resetDatabaseAdapter(): void {
  adapterInstance = null;
} 