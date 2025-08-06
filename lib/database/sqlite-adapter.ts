import 'server-only';

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Device } from '@/types/device';
import { DatabaseAdapter, DeviceRow, mapRowToDevice } from './adapter';
import { logger } from '@/lib/logger';
import { appConfig } from '@/lib/config';

// DeviceRow interface is now imported from adapter.ts

/**
 * SQLite Database Adapter
 * Direct implementation of SQLite operations for self-hosted mode
 * Ignores userId parameter as there's no multi-tenancy in self-hosted mode
 */
export class SQLiteAdapter implements DatabaseAdapter {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = appConfig.database.sqlitePath || path.join(process.cwd(), 'data', 'warranty.db');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private async initializeDatabase(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Initialize schema
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            serial_number TEXT UNIQUE NOT NULL,
            manufacturer TEXT NOT NULL,
            model TEXT,
            hostname TEXT,
            client_id TEXT,
            client_name TEXT,
            device_class TEXT,
            source_platform TEXT,
            source_device_id TEXT,
            
            warranty_start_date DATE,
            warranty_end_date DATE,
            warranty_fetched_at INTEGER,
            warranty_written_back_at INTEGER,
            
            created_at INTEGER DEFAULT (unixepoch('now')),
            updated_at INTEGER DEFAULT (unixepoch('now'))
          );
        `;

        const createIndexesSQL = [
          'CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);',
          'CREATE INDEX IF NOT EXISTS idx_devices_platform ON devices(source_platform);',
          'CREATE INDEX IF NOT EXISTS idx_devices_warranty_fetched ON devices(warranty_fetched_at);',
          'CREATE INDEX IF NOT EXISTS idx_devices_client_name ON devices(client_name);'
        ];

        this.db!.serialize(() => {
          this.db!.run(createTableSQL, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Create indexes
            let indexCount = 0;
            createIndexesSQL.forEach((indexSQL) => {
              this.db!.run(indexSQL, (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                indexCount++;
                if (indexCount === createIndexesSQL.length) {
                  resolve(this.db!);
                }
              });
            });
          });
        });
      });
    });
  }

  // mapRowToDevice function is now imported from adapter.ts

  private async runQuery<T = unknown>(
    query: string,
    params: unknown[] = []
  ): Promise<T[]> {
    return new Promise(async (resolve, reject) => {
      await this.initializeDatabase();
      
      this.db!.all(query, params, (err: Error | null, rows: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as T[]);
      });
    });
  }

  private async runStatement(
    query: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastID: number }> {
    return new Promise(async (resolve, reject) => {
      await this.initializeDatabase();
      
      this.db!.run(query, params, function(this: { changes: number; lastID: number }, err: Error | null) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  async insertOrUpdateDevice(device: Device, userId?: string): Promise<void> {
    // userId is ignored in self-hosted mode
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }

    // Validate required fields
    if (!device.serialNumber?.trim() || !device.manufacturer?.trim()) {
      throw new Error(`Device missing required fields: serialNumber='${device.serialNumber}', manufacturer='${device.manufacturer}'`);
    }

    // Check if device already exists by serial number
    const existingDevice = await this.getDeviceBySerial(device.serialNumber);
    
    if (existingDevice) {
      // Device exists - perform intelligent merge
      const mergedDevice: Device = {
        ...device, // Start with incoming device data
        id: existingDevice.id, // Keep existing database ID
        // Preserve existing warranty data if it exists and incoming doesn't have it
        warrantyStartDate: device.warrantyStartDate || existingDevice.warrantyStartDate,
        warrantyEndDate: device.warrantyEndDate || existingDevice.warrantyEndDate,
        warrantyFetchedAt: device.warrantyFetchedAt || existingDevice.warrantyFetchedAt,
        warrantyWrittenBackAt: device.warrantyWrittenBackAt || existingDevice.warrantyWrittenBackAt,
        // Update other fields from incoming data, but fall back to existing if not provided
        model: device.model || existingDevice.model,
        hostname: device.hostname || existingDevice.hostname,
        clientId: device.clientId || existingDevice.clientId,
        clientName: device.clientName || existingDevice.clientName,
        deviceClass: device.deviceClass || existingDevice.deviceClass,
        // Always update source information if provided (device might be found in multiple platforms)
        sourcePlatform: device.sourcePlatform || existingDevice.sourcePlatform,
        sourceDeviceId: device.sourceDeviceId || existingDevice.sourceDeviceId,
      };
      
      // Perform UPDATE operation
      const updateQuery = `
        UPDATE devices 
        SET manufacturer = ?, 
            model = ?, 
            hostname = ?, 
            client_id = ?, 
            client_name = ?, 
            device_class = ?, 
            source_platform = ?, 
            source_device_id = ?,
            warranty_start_date = ?, 
            warranty_end_date = ?, 
            warranty_fetched_at = ?, 
            warranty_written_back_at = ?,
            updated_at = unixepoch('now')
        WHERE serial_number = ?
      `;
      
      const updateParams = [
        mergedDevice.manufacturer,
        mergedDevice.model || null,
        mergedDevice.hostname || null,
        mergedDevice.clientId || null,
        mergedDevice.clientName || null,
        mergedDevice.deviceClass || null,
        mergedDevice.sourcePlatform || null,
        mergedDevice.sourceDeviceId || null,
        mergedDevice.warrantyStartDate || null,
        mergedDevice.warrantyEndDate || null,
        mergedDevice.warrantyFetchedAt || null,
        mergedDevice.warrantyWrittenBackAt || null,
        device.serialNumber
      ];
      
      await this.runStatement(updateQuery, updateParams);
      logger.debug(`Updated existing device: ${device.serialNumber}`, 'database', {
        serialNumber: device.serialNumber,
        manufacturer: device.manufacturer
      });
    } else {
      // Device doesn't exist - perform INSERT operation
      const insertQuery = `
        INSERT INTO devices (
          id, serial_number, manufacturer, model, hostname, 
          client_id, client_name, device_class, source_platform, source_device_id,
          warranty_start_date, warranty_end_date, 
          warranty_fetched_at, warranty_written_back_at, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch('now'), unixepoch('now'))
      `;
      
      const insertParams = [
        device.id || crypto.randomUUID(),
        device.serialNumber,
        device.manufacturer,
        device.model || null,
        device.hostname || null,
        device.clientId || null,
        device.clientName || null,
        device.deviceClass || null,
        device.sourcePlatform || null,
        device.sourceDeviceId || null,
        device.warrantyStartDate || null,
        device.warrantyEndDate || null,
        device.warrantyFetchedAt || null,
        device.warrantyWrittenBackAt || null
      ];
      
      await this.runStatement(insertQuery, insertParams);
      logger.debug(`Inserted new device: ${device.serialNumber}`, 'database', {
        serialNumber: device.serialNumber,
        manufacturer: device.manufacturer
      });
    }
  }

  async getDeviceBySerial(serialNumber: string, userId?: string): Promise<Device | null> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = 'SELECT * FROM devices WHERE serial_number = ?';
    const rows = await this.runQuery<DeviceRow>(query, [serialNumber]);
    return rows.length > 0 ? mapRowToDevice(rows[0]) : null;
  }

  async getAllDevices(userId?: string): Promise<Device[]> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = 'SELECT * FROM devices ORDER BY updated_at DESC';
    const rows = await this.runQuery<DeviceRow>(query);
    return rows.map(row => mapRowToDevice(row));
  }

  async getDevicesByPlatform(platform: string, userId?: string): Promise<Device[]> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = 'SELECT * FROM devices WHERE source_platform = ? ORDER BY updated_at DESC';
    const rows = await this.runQuery<DeviceRow>(query, [platform]);
    return rows.map(row => mapRowToDevice(row));
  }

  async deleteDeviceById(deviceId: string, userId?: string): Promise<void> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = `DELETE FROM devices WHERE id = ?`;
    await this.runStatement(query, [deviceId]);
  }

  async updateDeviceWarranty(
    serialNumber: string, 
    warranty: { startDate: string; endDate: string },
    userId?: string
  ): Promise<void> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = `
      UPDATE devices 
      SET warranty_start_date = ?, 
          warranty_end_date = ?, 
          warranty_fetched_at = unixepoch('now'),
          updated_at = unixepoch('now')
      WHERE serial_number = ?
    `;
    
    await this.runStatement(query, [warranty.startDate, warranty.endDate, serialNumber]);
  }

  async markWarrantyWrittenBack(serialNumber: string, userId?: string): Promise<void> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = `
      UPDATE devices 
      SET warranty_written_back_at = unixepoch('now'),
          updated_at = unixepoch('now')
      WHERE serial_number = ?
    `;
    
    await this.runStatement(query, [serialNumber]);
  }

  async getUniqueClientNames(userId?: string): Promise<string[]> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = `
      SELECT DISTINCT client_name 
      FROM devices 
      WHERE client_name IS NOT NULL 
      AND client_name != '' 
      ORDER BY client_name ASC
    `;
    
    const rows = await this.runQuery<{ client_name: string }>(query);
    return rows.map(row => row.client_name);
  }

  async getDevicesByClientName(clientName: string, userId?: string): Promise<Device[]> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = 'SELECT * FROM devices WHERE client_name = ? ORDER BY updated_at DESC';
    const rows = await this.runQuery<DeviceRow>(query, [clientName]);
    return rows.map(row => mapRowToDevice(row));
  }

  async getDeviceCountByClient(userId?: string): Promise<{ clientName: string; count: number }[]> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const query = `
      SELECT client_name, COUNT(*) as count
      FROM devices 
      WHERE client_name IS NOT NULL 
      AND client_name != ''
      GROUP BY client_name 
      ORDER BY count DESC, client_name ASC
    `;
    
    const rows = await this.runQuery<{ client_name: string; count: number }>(query);
    return rows.map(row => ({ clientName: row.client_name, count: row.count }));
  }

  async cleanupOldDevices(daysOld: number = 90, userId?: string): Promise<number> {
    if (userId) {
      logger.debug('SQLite adapter ignoring userId parameter (self-hosted mode)', 'database');
    }
    
    const thresholdTimestamp = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
    
    const query = `
      DELETE FROM devices 
      WHERE updated_at < ?
    `;
    
    const result = await this.runStatement(query, [thresholdTimestamp]);
    return result.changes;
  }

  /**
   * Execute raw SQL query (for subscription management and other advanced features)
   * Note: In self-hosted mode, subscriptions are not used, but we provide this for consistency
   */
  async executeQuery(query: string, params: unknown[] = []): Promise<{ rows: unknown[] }> {
    try {
      const rows = await this.runQuery(query, params);
      return { rows };
    } catch (error) {
      logger.error('SQLite query error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
} 