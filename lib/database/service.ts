'use server';

import { Device } from '@/types/device';
import { getDatabaseAdapter } from './factory';
import { isSaaSMode } from '@/lib/config';
import { getCurrentUser } from '@/lib/supabase/auth';

/**
 * Unified Database Service
 * Provides clean API for database operations
 * Automatically handles user context for SaaS mode by getting current user from Supabase
 */

// Helper function to get user context for SaaS mode
async function getUserId(): Promise<string | undefined> {
  if (!isSaaSMode()) {
    return undefined; // Self-hosted mode doesn't need user context
  }

  // Automatically get current user from Supabase session
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found. Please log in to access this resource.');
    }
    return user.id;
  } catch (error) {
    throw new Error(`Authentication required: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Basic CRUD operations - user context handled automatically
export async function insertOrUpdateDevice(device: Device): Promise<void> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.insertOrUpdateDevice(device, userId);
}

export async function getDeviceBySerial(serialNumber: string): Promise<Device | null> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getDeviceBySerial(serialNumber, userId);
}

export async function getAllDevices(): Promise<Device[]> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getAllDevices(userId);
}

export async function getDevicesByPlatform(platform: string): Promise<Device[]> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getDevicesByPlatform(platform, userId);
}

export async function deleteDeviceById(deviceId: string): Promise<void> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.deleteDeviceById(deviceId, userId);
}

// Warranty operations
export async function updateDeviceWarranty(
  serialNumber: string, 
  warranty: { startDate: string; endDate: string }
): Promise<void> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.updateDeviceWarranty(serialNumber, warranty, userId);
}

export async function markWarrantyWrittenBack(serialNumber: string): Promise<void> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.markWarrantyWrittenBack(serialNumber, userId);
}

// Client operations (MSP functionality)
export async function getUniqueClientNames(): Promise<string[]> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getUniqueClientNames(userId);
}

export async function getDevicesByClientName(clientName: string): Promise<Device[]> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getDevicesByClientName(clientName, userId);
}

export async function getDeviceCountByClient(): Promise<{ clientName: string; count: number }[]> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.getDeviceCountByClient(userId);
}

// Utility operations
export async function cleanupOldDevices(daysOld: number = 90): Promise<number> {
  const adapter = getDatabaseAdapter();
  const userId = await getUserId();
  return adapter.cleanupOldDevices(daysOld, userId);
}

// Connection management
export async function closeDatabase(): Promise<void> {
  const adapter = getDatabaseAdapter();
  return adapter.close();
}

 