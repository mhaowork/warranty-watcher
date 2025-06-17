'use server';

import { Device } from '../../types/device';
import { WarrantyInfo } from '../../types/warranty';
import { Platform } from '../../types/platform';
import { Manufacturer } from '../../types/manufacturer';
import { ManufacturerCredentials } from '../../types/credentials';
import { getDellWarrantyInfo } from '../manufacturers/dell';
import { getHpWarrantyInfo } from '../manufacturers/hp';
import { getLenovoWarrantyInfo } from '../manufacturers/lenovo';
import { 
  insertOrUpdateDevice, 
  getDeviceBySerial, 
  updateDeviceWarranty,
  markWarrantyWrittenBack,
} from '../database';
import { deviceToWarrantyInfo } from '../utils/deviceUtils';
import { logger } from '@/lib/logger';

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
  logger.info(`Storing ${devices.length} devices from ${sourcePlatform} in database...`, 'warranty-sync');
  
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
      logger.debug(`Stored device: ${device.serialNumber}`, 'warranty-sync', { 
        serialNumber: device.serialNumber,
        manufacturer: device.manufacturer,
        sourcePlatform 
      });
    } catch (error) {
      logger.error(`Error storing device ${device.serialNumber} from ${sourcePlatform}: ${error}`, 'warranty-sync', {
        serialNumber: device.serialNumber,
        sourcePlatform,
        error: error instanceof Error ? error.message : String(error)
      });
      errorCount++;
      // Continue with other devices even if one fails
    }
  }
  
  logger.info(`Successfully stored ${successCount} devices from ${sourcePlatform}. Errors: ${errorCount}`, 'warranty-sync', {
    successCount,
    errorCount,
    sourcePlatform
  });
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
        logger.debug(`Skipping ${device.serialNumber} - already has warranty info in database`, 'warranty-sync', {
          serialNumber: device.serialNumber,
          warrantyFetchedAt: dbDevice.warrantyFetchedAt
        });
      }
    } catch (error) {
      logger.error(`Error checking warranty existence for ${device.serialNumber}: ${error}`, 'warranty-sync', {
        serialNumber: device.serialNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      // If there's an error, include the device for lookup to be safe
      devicesNeedingLookup.push(device);
    }
  }
  
  return devicesNeedingLookup;
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
    
    logger.info(`Stored warranty info for ${serialNumber} in database`, 'warranty-sync', {
      serialNumber
    });
  } catch (error) {
    logger.error(`Error storing warranty info for ${serialNumber}: ${error}`, 'warranty-sync', {
      serialNumber,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't throw - this shouldn't break the sync process
  }
}

/**
 * Mark warranty as written back to source platform
 */
export async function markWarrantyAsWrittenBack(serialNumber: string): Promise<void> {
  try {
    await markWarrantyWrittenBack(serialNumber);
    logger.info(`Marked warranty as written back for ${serialNumber}`, 'warranty-sync', {
      serialNumber
    });
  } catch (error) {
    logger.error(`Error marking warranty as written back for ${serialNumber}: ${error}`, 'warranty-sync', {
      serialNumber,
      error: error instanceof Error ? error.message : String(error)
    });
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
  const warrantyInfo = deviceToWarrantyInfo(device);
  if (!device.serialNumber) {
    logger.warn(`Skipping device ID ${device.id} - no serial number.`, 'warranty-sync', {
      deviceId: device.id
    });
    warrantyInfo.error = true;
    warrantyInfo.errorMessage = 'Missing serial number';
    warrantyInfo.skipped = true;
    return warrantyInfo;
  }

  logger.info(`Fetching warranty from external API for ${device.serialNumber}`, 'warranty-sync', {
    serialNumber: device.serialNumber,
    manufacturer: device.manufacturer
  });
  // TODO: fix the type def for warrantyDates (it should not be WarrantyInfo)
  try {
    // Use manufacturer-specific API implementations
    if (device.manufacturer === Manufacturer.DELL) {
      const dellCredentials = manufacturerCredentials[Manufacturer.DELL];
      const warrantyDates = await getDellWarrantyInfo(
        device.serialNumber,
        dellCredentials?.clientId,
        dellCredentials?.clientSecret
      );
      
      // Store the warranty data in database
      await storeWarrantyInfo(device.serialNumber, warrantyDates);
      warrantyInfo.startDate = warrantyDates.startDate;
      warrantyInfo.endDate = warrantyDates.endDate;
      return warrantyInfo;
    } else if (device.manufacturer === Manufacturer.HP) {
      const hpCredentials = manufacturerCredentials[Manufacturer.HP];
      const warrantyDates = await getHpWarrantyInfo(
        device.serialNumber,
        hpCredentials?.apiKey
      );
      
      // Store the warranty data in database
      await storeWarrantyInfo(device.serialNumber, warrantyDates);
      warrantyInfo.startDate = warrantyDates.startDate;
      warrantyInfo.endDate = warrantyDates.endDate;
      return warrantyInfo;
    } else if (device.manufacturer === Manufacturer.LENOVO) {
      const lenovoCredentials = manufacturerCredentials[Manufacturer.LENOVO];
      const warrantyDates = await getLenovoWarrantyInfo(
        device.serialNumber,
        lenovoCredentials?.apiKey
      );
      
      // Store the warranty data in database
      await storeWarrantyInfo(device.serialNumber, warrantyDates);
      warrantyInfo.startDate = warrantyDates.startDate;
      warrantyInfo.endDate = warrantyDates.endDate;
      return warrantyInfo;
    } else {
      throw new Error(`Unsupported manufacturer or invalid/missing credentials for ${device.manufacturer}`);
    }

  } catch (error) {
    logger.error(`Error fetching warranty for ${device.serialNumber} from external API: ${error}`, 'warranty-sync', {
      serialNumber: device.serialNumber,
      manufacturer: device.manufacturer,
      error: error instanceof Error ? error.message : String(error)
    });
    warrantyInfo.error = true;
    warrantyInfo.errorMessage = error instanceof Error ? error.message : 'API fetch failed';
    return warrantyInfo;
  }
}
