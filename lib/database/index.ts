'use server';

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import { logger } from '@/lib/logger';

// Database path configuration
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'warranty.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
let db: sqlite3.Database;

// Initialize database connection and schema
function initializeDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    db = new sqlite3.Database(dbPath, (err) => {
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

      db.serialize(() => {
        db.run(createTableSQL, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create indexes
          let indexCount = 0;
          createIndexesSQL.forEach((indexSQL) => {
            db.run(indexSQL, (err) => {
              if (err) {
                reject(err);
                return;
              }
              indexCount++;
              if (indexCount === createIndexesSQL.length) {
                resolve(db);
              }
            });
          });
        });
      });
    });
  });
}

// Database row interface
interface DeviceRow {
  id: string;
  serial_number: string;
  manufacturer: Manufacturer;
  model: string | null;
  hostname: string | null;
  client_id: string | null;
  client_name: string | null;
  device_class: string | null;
  source_platform: string | null;
  source_device_id: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_fetched_at: number | null;
  warranty_written_back_at: number | null;
  created_at: number;
  updated_at: number;
}

// Helper function to map database row to Device object
function mapRowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    manufacturer: row.manufacturer,
    model: row.model || undefined,
    hostname: row.hostname || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
    deviceClass: row.device_class || undefined,
    sourcePlatform: row.source_platform || undefined,
    sourceDeviceId: row.source_device_id || undefined,
    warrantyStartDate: row.warranty_start_date || undefined,
    warrantyEndDate: row.warranty_end_date || undefined,
    warrantyFetchedAt: row.warranty_fetched_at || undefined,
    warrantyWrittenBackAt: row.warranty_written_back_at || undefined,
  };
}

// Promise wrapper for database operations
function runQuery<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    await initializeDatabase();
    
    db.all(query, params, (err: Error | null, rows: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });
}

async function runStatement(
  query: string,
  params: unknown[] = []
): Promise<{ changes: number; lastID: number }> {
  return new Promise(async (resolve, reject) => {
    await initializeDatabase();
    
    db.run(query, params, function(this: { changes: number; lastID: number }, err: Error | null) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

// Basic CRUD operations
export async function insertOrUpdateDevice(device: Device): Promise<void> {
  // Validate required fields
  if (!device.serialNumber?.trim() || !device.manufacturer?.trim()) {
    throw new Error(`Device missing required fields: serialNumber='${device.serialNumber}', manufacturer='${device.manufacturer}'`);
  }

  // Check if device already exists by serial number
  const existingDevice = await getDeviceBySerial(device.serialNumber);
  
  if (existingDevice) {
    // Device exists - perform intelligent merge
    // Preserve existing warranty data if it's more complete than incoming data
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
    
    await runStatement(updateQuery, updateParams);
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
      device.id || device.serialNumber, // Use serialNumber as fallback ID
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
    
    await runStatement(insertQuery, insertParams);
    logger.debug(`Inserted new device: ${device.serialNumber}`, 'database', {
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer
    });
  }
}

export async function getDeviceBySerial(serialNumber: string): Promise<Device | null> {
  const query = 'SELECT * FROM devices WHERE serial_number = ?';
  const rows = await runQuery<DeviceRow>(query, [serialNumber]);
  return rows.length > 0 ? mapRowToDevice(rows[0]) : null;
}

export async function getAllDevices(): Promise<Device[]> {
  const query = 'SELECT * FROM devices ORDER BY updated_at DESC';
  const rows = await runQuery<DeviceRow>(query);
  return rows.map(mapRowToDevice);
}

export async function getDevicesByPlatform(platform: string): Promise<Device[]> {
  const query = 'SELECT * FROM devices WHERE source_platform = ? ORDER BY updated_at DESC';
  const rows = await runQuery<DeviceRow>(query, [platform]);
  return rows.map(mapRowToDevice);
}

export async function updateDeviceWarranty(serialNumber: string, warranty: {
  startDate: string;
  endDate: string;
}): Promise<void> {
  const query = `
    UPDATE devices 
    SET warranty_start_date = ?, 
        warranty_end_date = ?, 
        warranty_fetched_at = unixepoch('now'),
        updated_at = unixepoch('now')
    WHERE serial_number = ?
  `;
  
  await runStatement(query, [warranty.startDate, warranty.endDate, serialNumber]);
}

export async function markWarrantyWrittenBack(serialNumber: string): Promise<void> {
  const query = `
    UPDATE devices 
    SET warranty_written_back_at = unixepoch('now'),
        updated_at = unixepoch('now')
    WHERE serial_number = ?
  `;
  
  await runStatement(query, [serialNumber]);
}

// Cleanup function for old devices (utility)
export async function cleanupOldDevices(daysOld: number = 90): Promise<number> {
  const thresholdTimestamp = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
  
  const query = `
    DELETE FROM devices 
    WHERE updated_at < ?
  `;
  
  const result = await runStatement(query, [thresholdTimestamp]);
  return result.changes;
}

// Close database connection (for cleanup)
export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Export database instance for advanced usage (initialize first)
export async function getDatabase(): Promise<sqlite3.Database> {
  return await initializeDatabase();
}

// Multi-tenant functions for client-specific operations
export async function getUniqueClientNames(): Promise<string[]> {
  const query = `
    SELECT DISTINCT client_name 
    FROM devices 
    WHERE client_name IS NOT NULL 
    AND client_name != '' 
    ORDER BY client_name ASC
  `;
  
  const rows = await runQuery<{ client_name: string }>(query);
  return rows.map(row => row.client_name);
}

export async function getDevicesByClientName(clientName: string): Promise<Device[]> {
  const query = 'SELECT * FROM devices WHERE client_name = ? ORDER BY updated_at DESC';
  const rows = await runQuery<DeviceRow>(query, [clientName]);
  return rows.map(mapRowToDevice);
}

export async function getDeviceCountByClient(): Promise<{ clientName: string; count: number }[]> {
  const query = `
    SELECT client_name, COUNT(*) as count
    FROM devices 
    WHERE client_name IS NOT NULL 
    AND client_name != ''
    GROUP BY client_name 
    ORDER BY count DESC, client_name ASC
  `;
  
  const rows = await runQuery<{ client_name: string; count: number }>(query);
  return rows.map(row => ({ clientName: row.client_name, count: row.count }));
}


export async function deleteDeviceById(deviceId: string): Promise<void> {
  const query = `DELETE FROM devices WHERE id = ?`;
  await runStatement(query, [deviceId]);
} 