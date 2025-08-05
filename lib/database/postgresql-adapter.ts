import 'server-only';

import { Device } from '@/types/device';
import { DatabaseAdapter, DeviceRow, mapRowToDevice } from './adapter';
import { logger } from '@/lib/logger';
import { Pool, PoolClient } from 'pg';

// Database row interfaces are now imported from adapter.ts

/**
 * PostgreSQL Database Adapter
 * Implements multi-tenant database operations for SaaS mode
 * All operations are filtered by userId for data isolation
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  private async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // mapRowToDevice function is now imported from adapter.ts

  async insertOrUpdateDevice(device: Device, userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    // Validate required fields
    if (!device.serialNumber?.trim() || !device.manufacturer?.trim()) {
      throw new Error(`Device missing required fields: serialNumber='${device.serialNumber}', manufacturer='${device.manufacturer}'`);
    }

    const client = await this.getClient();
    
    try {
      // Check if device already exists by serial number and userId
      const existingQuery = `
        SELECT * FROM devices 
        WHERE serial_number = $1 AND user_id = $2
      `;
      const existingResult = await client.query(existingQuery, [device.serialNumber, userId]);
      
      if (existingResult.rows.length > 0) {
        // Device exists - perform UPDATE with intelligent merge
        const existingDevice = mapRowToDevice(existingResult.rows[0]);
        
        const mergedDevice: Device = {
          ...device,
          id: existingDevice.id,
          warrantyStartDate: device.warrantyStartDate || existingDevice.warrantyStartDate,
          warrantyEndDate: device.warrantyEndDate || existingDevice.warrantyEndDate,
          warrantyFetchedAt: device.warrantyFetchedAt || existingDevice.warrantyFetchedAt,
          warrantyWrittenBackAt: device.warrantyWrittenBackAt || existingDevice.warrantyWrittenBackAt,
          model: device.model || existingDevice.model,
          hostname: device.hostname || existingDevice.hostname,
          clientId: device.clientId || existingDevice.clientId,
          clientName: device.clientName || existingDevice.clientName,
          deviceClass: device.deviceClass || existingDevice.deviceClass,
          sourcePlatform: device.sourcePlatform || existingDevice.sourcePlatform,
          sourceDeviceId: device.sourceDeviceId || existingDevice.sourceDeviceId,
        };

        const updateQuery = `
          UPDATE devices 
          SET manufacturer = $1, 
              model = $2, 
              hostname = $3, 
              client_id = $4, 
              client_name = $5, 
              device_class = $6, 
              source_platform = $7, 
              source_device_id = $8,
              warranty_start_date = $9, 
              warranty_end_date = $10, 
              warranty_fetched_at = $11, 
              warranty_written_back_at = $12,
              updated_at = NOW()
          WHERE serial_number = $13 AND user_id = $14
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
          device.serialNumber,
          userId
        ];

        await client.query(updateQuery, updateParams);
        logger.debug(`Updated existing device: ${device.serialNumber}`, 'database', {
          serialNumber: device.serialNumber,
          manufacturer: device.manufacturer,
          userId
        });
      } else {
        // Device doesn't exist - perform INSERT
        const insertQuery = `
          INSERT INTO devices (
            id, user_id, serial_number, manufacturer, model, hostname, 
            client_id, client_name, device_class, source_platform, source_device_id,
            warranty_start_date, warranty_end_date, 
            warranty_fetched_at, warranty_written_back_at, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        `;

        const insertParams = [
          device.id || crypto.randomUUID(),
          userId,
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

        await client.query(insertQuery, insertParams);
        logger.debug(`Inserted new device: ${device.serialNumber}`, 'database', {
          serialNumber: device.serialNumber,
          manufacturer: device.manufacturer,
          userId
        });
      }
    } finally {
      client.release();
    }
  }

  async getDeviceBySerial(serialNumber: string, userId?: string): Promise<Device | null> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = 'SELECT * FROM devices WHERE serial_number = $1 AND user_id = $2';
      const result = await client.query(query, [serialNumber, userId]);
      return result.rows.length > 0 ? mapRowToDevice(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getAllDevices(userId?: string): Promise<Device[]> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = 'SELECT * FROM devices WHERE user_id = $1 ORDER BY updated_at DESC';
      const result = await client.query(query, [userId]);
      return result.rows.map((row: DeviceRow) => mapRowToDevice(row));
    } finally {
      client.release();
    }
  }

  async getDevicesByPlatform(platform: string, userId?: string): Promise<Device[]> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = 'SELECT * FROM devices WHERE source_platform = $1 AND user_id = $2 ORDER BY updated_at DESC';
      const result = await client.query(query, [platform, userId]);
      return result.rows.map((row: DeviceRow) => mapRowToDevice(row));
    } finally {
      client.release();
    }
  }

  async deleteDeviceById(deviceId: string, userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = 'DELETE FROM devices WHERE id = $1 AND user_id = $2';
      await client.query(query, [deviceId, userId]);
    } finally {
      client.release();
    }
  }

  async updateDeviceWarranty(
    serialNumber: string, 
    warranty: { startDate: string; endDate: string },
    userId?: string
  ): Promise<void> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = `
        UPDATE devices 
        SET warranty_start_date = $1, 
            warranty_end_date = $2, 
            warranty_fetched_at = EXTRACT(EPOCH FROM NOW())::integer,
            updated_at = NOW()
        WHERE serial_number = $3 AND user_id = $4
      `;
      
      await client.query(query, [warranty.startDate, warranty.endDate, serialNumber, userId]);
    } finally {
      client.release();
    }
  }

  async markWarrantyWrittenBack(serialNumber: string, userId?: string): Promise<void> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = `
        UPDATE devices 
        SET warranty_written_back_at = EXTRACT(EPOCH FROM NOW())::integer,
            updated_at = NOW()
        WHERE serial_number = $1 AND user_id = $2
      `;
      
      await client.query(query, [serialNumber, userId]);
    } finally {
      client.release();
    }
  }

  async getUniqueClientNames(userId?: string): Promise<string[]> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = `
        SELECT DISTINCT client_name 
        FROM devices 
        WHERE client_name IS NOT NULL 
        AND client_name != '' 
        AND user_id = $1
        ORDER BY client_name ASC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.map((row: { client_name: string }) => row.client_name);
    } finally {
      client.release();
    }
  }

  async getDevicesByClientName(clientName: string, userId?: string): Promise<Device[]> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = 'SELECT * FROM devices WHERE client_name = $1 AND user_id = $2 ORDER BY updated_at DESC';
      const result = await client.query(query, [clientName, userId]);
      return result.rows.map((row: DeviceRow) => mapRowToDevice(row));
    } finally {
      client.release();
    }
  }

  async getDeviceCountByClient(userId?: string): Promise<{ clientName: string; count: number }[]> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const query = `
        SELECT client_name, COUNT(*) as count
        FROM devices 
        WHERE client_name IS NOT NULL 
        AND client_name != ''
        AND user_id = $1
        GROUP BY client_name 
        ORDER BY count DESC, client_name ASC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.map((row: { client_name: string; count: number }) => ({ 
        clientName: row.client_name, 
        count: typeof row.count === 'string' ? parseInt(row.count) : row.count 
      }));
    } finally {
      client.release();
    }
  }

  async cleanupOldDevices(daysOld: number = 90, userId?: string): Promise<number> {
    if (!userId) {
      throw new Error('userId is required for PostgreSQL adapter (SaaS mode)');
    }

    const client = await this.getClient();
    
    try {
      const thresholdTimestamp = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
      
      const query = `
        DELETE FROM devices 
        WHERE updated_at < to_timestamp($1) AND user_id = $2
      `;
      
      const result = await client.query(query, [thresholdTimestamp, userId]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
} 