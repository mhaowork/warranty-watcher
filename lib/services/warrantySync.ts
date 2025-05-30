import { Device } from '../../types/device';
import { WarrantyInfo } from '../../types/warranty';
import { Platform } from '../../types/platform';
import { Manufacturer } from '../../types/manufacturer';
import { ManufacturerCredentials } from '../../types/credentials';
import { inferWarrantyStatus } from '../utils/warrantyUtils';
import { 
  insertOrUpdateDevice, 
  getDeviceBySerial, 
  updateDeviceWarranty,
  markWarrantyWrittenBack,
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
 * Stores a list of devices in the database, enhancing them with source information.
 * This is the primary function for ingesting devices from any source (platform or CSV).
 */
export async function storeDevicesInPool(
  devices: Device[], 
  sourcePlatform: Platform
): Promise<{ successCount: number; errorCount: number }> {
  console.log(`Storing ${devices.length} devices from ${sourcePlatform} in database...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const device of devices) {
    try {
      const deviceToStore: Device = {
        ...device,
        id: device.id || device.serialNumber, // Ensure ID for database primary key
        sourcePlatform: sourcePlatform,
        // Preserve existing sourceDeviceId if available, otherwise use device.id from platform
        sourceDeviceId: device.sourceDeviceId || device.id, 
      };

      await insertOrUpdateDevice(deviceToStore);
      successCount++;
    } catch (error) {
      console.error(`Error storing device ${device.serialNumber} from ${sourcePlatform}:`, error);
      errorCount++;
      // Continue with other devices even if one fails
    }
  }
  
  console.log(`Successfully stored ${successCount} devices from ${sourcePlatform}. Errors: ${errorCount}`);
  return { successCount, errorCount };
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
      fromCache: true,
      lastUpdated: new Date(device.warrantyFetchedAt * 1000).toISOString()
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
 * Fetches warranty information for a single device and stores it in the database.
 * It first checks the cache, then external APIs if necessary.
 */
export async function fetchAndStoreDeviceWarranty(
  device: Device,
  manufacturerCredentials: ManufacturerCredentials
): Promise<WarrantyInfo> {
  if (!device.serialNumber) {
    console.warn(`Skipping device ID ${device.id} - no serial number.`);
    return {
      serialNumber: device.serialNumber || 'N/A',
      manufacturer: device.manufacturer,
      startDate: '',
      endDate: '',
      status: 'unknown',
      error: true,
      errorMessage: 'Missing serial number',
      fromCache: false,
      deviceSource: device.sourcePlatform
    };
  }

  // 1. Try to get from cache (database)
  const cachedWarranty = await getCachedWarrantyInfo(device.serialNumber);
  if (cachedWarranty) {
    console.log(`Using cached warranty for ${device.serialNumber}`);
    return { ...cachedWarranty, deviceSource: device.sourcePlatform };
  }

  // 2. If not in cache, fetch from external API
  console.log(`Fetching warranty from external API for ${device.serialNumber}`);
  try {
    // Placeholder for actual API call - replace with actual manufacturer API logic
    // const manufacturerApi = getManufacturerApiService(device.manufacturer);
    // const warrantyData = await manufacturerApi.getWarranty(device.serialNumber, manufacturerCredentials[device.manufacturer]);
    
    // SIMULATING API CALL FOR NOW
    if (device.manufacturer === Manufacturer.DELL && manufacturerCredentials[Manufacturer.DELL]?.clientId) {
      // Simulate successful Dell API call
      const simulatedDellWarranty = {
        startDate: '2022-01-01',
        endDate: '2025-01-01',
        productDescription: device.model || 'Dell Product',
      };
      // Ensure we pass all required fields for WarrantyInfo to storeWarrantyInfo
      const warrantyToStore: WarrantyInfo = {
        serialNumber: device.serialNumber,
        manufacturer: device.manufacturer,
        startDate: simulatedDellWarranty.startDate,
        endDate: simulatedDellWarranty.endDate,
        status: inferWarrantyStatus(simulatedDellWarranty.endDate),
        productDescription: simulatedDellWarranty.productDescription,
      };
      await storeWarrantyInfo(device.serialNumber, warrantyToStore);
      return {
        ...warrantyToStore,
        fromCache: false, // Fetched from API
        deviceSource: device.sourcePlatform
      };
    } else if (device.manufacturer === Manufacturer.HP /* && check HP creds */) {
      // TODO: Implement HP API call simulation
      throw new Error(`HP API not implemented yet for ${device.manufacturer}`);
    } else {
      throw new Error(`Unsupported manufacturer or invalid/missing credentials for ${device.manufacturer}`);
    }

  } catch (error) {
    console.error(`Error fetching warranty for ${device.serialNumber} from external API:`, error);
    return {
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      startDate: '',
      endDate: '',
      status: 'unknown',
      error: true,
      errorMessage: error instanceof Error ? error.message : 'API fetch failed',
      fromCache: false,
      deviceSource: device.sourcePlatform
    };
  }
}
