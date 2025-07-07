import { Device } from '@/types/device';
import { Manufacturer } from '@/types/manufacturer';

/**
 * User context for database operations
 * userId is optional to support both modes:
 * - Required in SaaS mode (enforced at service layer)
 * - Ignored in self-hosted mode
 */
export interface UserContext {
  userId?: string;
}

/**
 * Unified database row interface that works for both SQLite and PostgreSQL
 * Each adapter maps their specific row format to this interface
 */
export interface DeviceRow {
  id: string;
  user_id?: string; // Only present in PostgreSQL, undefined in SQLite
  serial_number: string;
  manufacturer: string;
  model: string | null;
  hostname: string | null;
  client_id: string | null;
  client_name: string | null;
  device_class: string | null;
  source_platform: string | null;
  source_device_id: string | null;
  warranty_start_date: string | Date | null; // SQLite uses strings, PostgreSQL uses Date
  warranty_end_date: string | Date | null; // SQLite uses strings, PostgreSQL uses Date
  warranty_fetched_at: number | null;
  warranty_written_back_at: number | null;
  created_at: number | Date; // SQLite uses number, PostgreSQL uses Date
  updated_at: number | Date; // SQLite uses number, PostgreSQL uses Date
}

/**
 * Helper function to convert Date objects to ISO date strings
 * PostgreSQL returns Date objects, but we need strings for the frontend
 */
function dateToString(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  }
  return value;
}

/**
 * Shared utility function to map database rows to Device objects
 * Works with both SQLite and PostgreSQL row formats
 * Handles Date object conversion from PostgreSQL
 */
export function mapRowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    manufacturer: row.manufacturer as Manufacturer,
    model: row.model || undefined,
    hostname: row.hostname || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
    deviceClass: row.device_class || undefined,
    sourcePlatform: row.source_platform || undefined,
    sourceDeviceId: row.source_device_id || undefined,
    warrantyStartDate: dateToString(row.warranty_start_date),
    warrantyEndDate: dateToString(row.warranty_end_date),
    warrantyFetchedAt: row.warranty_fetched_at || undefined,
    warrantyWrittenBackAt: row.warranty_written_back_at || undefined,
  };
}

/**
 * Database adapter interface
 * Provides a unified API for different database backends
 */
export interface DatabaseAdapter {
  // Basic CRUD operations
  insertOrUpdateDevice(device: Device, userId?: string): Promise<void>;
  getDeviceBySerial(serialNumber: string, userId?: string): Promise<Device | null>;
  getAllDevices(userId?: string): Promise<Device[]>;
  getDevicesByPlatform(platform: string, userId?: string): Promise<Device[]>;
  deleteDeviceById(deviceId: string, userId?: string): Promise<void>;

  // Warranty operations
  updateDeviceWarranty(
    serialNumber: string, 
    warranty: { startDate: string; endDate: string },
    userId?: string
  ): Promise<void>;
  markWarrantyWrittenBack(serialNumber: string, userId?: string): Promise<void>;

  // Client operations (MSP functionality)
  getUniqueClientNames(userId?: string): Promise<string[]>;
  getDevicesByClientName(clientName: string, userId?: string): Promise<Device[]>;
  getDeviceCountByClient(userId?: string): Promise<{ clientName: string; count: number }[]>;

  // Utility operations
  cleanupOldDevices(daysOld: number, userId?: string): Promise<number>;
  
  // Connection management
  close(): Promise<void>;
} 