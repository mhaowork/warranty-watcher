import { Device } from '../../types/device';
import { WarrantyInfo } from '../../types/warranty';
import { Platform } from '../../types/platform';
import { inferWarrantyStatus } from '../utils/warrantyUtils';
import { 
  insertOrUpdateDevice, 
  getDeviceBySerial, 
  getDevicesNeedingWarrantyLookup,
  updateDeviceWarranty,
  markWarrantyWrittenBack,
  getAllDevices
} from '../database';

export interface SyncOptions {
  writeBackToSource: boolean;
  skipExistingWarrantyInfo: boolean;
}

export interface SyncResult {
  device: Device;
  warrantyInfo: WarrantyInfo;
  fromCache: boolean;
  writtenBack?: boolean;
  skipped?: boolean;
  error?: boolean;
}

/**
 * Store devices from platform fetch in the database
 */
export async function storeDevicesFromPlatform(
  devices: Device[], 
  platform: Platform
): Promise<void> {
  console.log(`Storing ${devices.length} devices from ${platform} in database...`);
  
  for (const device of devices) {
    try {
      // Enhance device with platform information
      const deviceWithPlatform: Device = {
        ...device,
        sourcePlatform: platform,
        sourceDeviceId: device.id
      };
      
      await insertOrUpdateDevice(deviceWithPlatform);
    } catch (error) {
      console.error(`Error storing device ${device.serialNumber}:`, error);
      // Continue with other devices even if one fails
    }
  }
  
  console.log(`Successfully stored devices from ${platform}`);
}

/**
 * Get devices that need warranty lookup based on database state and sync options
 */
export async function getDevicesForWarrantySync(
  devices: Device[],
  options: SyncOptions
): Promise<Device[]> {
  const { skipExistingWarrantyInfo } = options;
  
  if (!skipExistingWarrantyInfo) {
    // If not skipping existing warranty info, process all devices
    return devices;
  }
  
  // Filter devices based on database warranty existence
  const devicesNeedingLookup: Device[] = [];
  
  for (const device of devices) {
    try {
      // Check database for existing warranty info
      const dbDevice = await getDeviceBySerial(device.serialNumber);
      
      if (!dbDevice || !dbDevice.warrantyFetchedAt) {
        // Device not in database or no warranty info fetched yet
        devicesNeedingLookup.push(device);
      } else {
        console.log(`Skipping ${device.serialNumber} - already has warranty info in database`);
      }
    } catch (error) {
      console.error(`Error checking warranty existence for ${device.serialNumber}:`, error);
      // If there's an error, include the device for lookup to be safe
      devicesNeedingLookup.push(device);
    }
  }
  
  return devicesNeedingLookup;
}

/**
 * Get cached warranty info from database if available
 */
export async function getCachedWarrantyInfo(
  serialNumber: string
): Promise<WarrantyInfo | null> {
  try {
    const device = await getDeviceBySerial(serialNumber);
    
    if (!device || !device.warrantyFetchedAt) {
      return null;
    }
    
    // Return cached warranty info with inferred status
    return {
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      startDate: device.warrantyStartDate || '',
      endDate: device.warrantyEndDate || '',
      status: inferWarrantyStatus(device.warrantyEndDate),
      productDescription: device.model,
      fromCache: true
    };
  } catch (error) {
    console.error(`Error getting cached warranty for ${serialNumber}:`, error);
    return null;
  }
}

/**
 * Store warranty info in database after successful API lookup
 */
export async function storeWarrantyInfo(
  serialNumber: string,
  warrantyInfo: WarrantyInfo
): Promise<void> {
  try {
    await updateDeviceWarranty(serialNumber, {
      startDate: warrantyInfo.startDate,
      endDate: warrantyInfo.endDate
    });
    
    console.log(`Stored warranty info for ${serialNumber} in database`);
  } catch (error) {
    console.error(`Error storing warranty info for ${serialNumber}:`, error);
    // Don't throw - this shouldn't break the sync process
  }
}

/**
 * Mark warranty as written back to source platform
 */
export async function markWarrantyAsWrittenBack(serialNumber: string): Promise<void> {
  try {
    await markWarrantyWrittenBack(serialNumber);
    console.log(`Marked warranty as written back for ${serialNumber}`);
  } catch (error) {
    console.error(`Error marking warranty as written back for ${serialNumber}:`, error);
    // Don't throw - this shouldn't break the sync process
  }
}

/**
 * Get database statistics for sync reporting
 */
export async function getSyncStats(): Promise<{
  totalDevices: number;
  devicesWithWarranty: number;
  devicesNeedingLookup: number;
}> {
  try {
    const allDevices = await getAllDevices();
    const devicesNeedingLookup = await getDevicesNeedingWarrantyLookup();
    
    return {
      totalDevices: allDevices.length,
      devicesWithWarranty: allDevices.filter(d => d.hasWarrantyInfo).length,
      devicesNeedingLookup: devicesNeedingLookup.length
    };
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return {
      totalDevices: 0,
      devicesWithWarranty: 0,
      devicesNeedingLookup: 0
    };
  }
}
