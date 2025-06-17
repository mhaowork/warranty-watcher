'use client';

import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getManufacturerCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import { fetchAndStoreDeviceWarranty } from '@/lib/services/warrantySync';
import { logger } from '@/lib/logger';

export interface WarrantyLookupOptions {
  skipExistingForLookup: boolean;
  onProgress?: (progress: number) => void;
  onDeviceResult?: (result: WarrantyInfo, deviceIndex: number, totalDevices: number) => void;
}

export interface WarrantyLookupResult {
  results: WarrantyInfo[];
  success: boolean;
  error?: string;
}

export async function lookupWarrantiesForDevices(
  devices: Device[],
  options: WarrantyLookupOptions
): Promise<WarrantyLookupResult> {
  const { skipExistingForLookup, onProgress, onDeviceResult } = options;
  
  logger.info(`Starting warranty lookup for ${devices.length} devices`, 'warranty-lookup', {
    deviceCount: devices.length,
    skipExisting: skipExistingForLookup
  });
  
  if (!devices.length) {
    const error = 'No devices provided to process for warranty lookup.';
    logger.warn(error, 'warranty-lookup');
    return {
      results: [],
      success: false,
      error
    };
  }

  try {
    const manufacturerCreds = getManufacturerCredentials();
    logger.debug('Retrieved manufacturer credentials', 'warranty-lookup');
    
    onProgress?.(5); // Initial setup complete

    const results: WarrantyInfo[] = [];
    const totalDevices = devices.length;

    // Process each device individually
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      let warrantyInfo: WarrantyInfo;
      
      try {
        // Ensure device has a serial number before attempting to fetch warranty
        if (!device.serialNumber) {
          logger.warn(`Skipping device ID ${device.id || 'N/A'} due to missing serial number`, 'warranty-lookup', {
            deviceId: device.id,
            deviceIndex: i
          });
          warrantyInfo = deviceToWarrantyInfo(device);
          warrantyInfo.error = true;
          warrantyInfo.errorMessage = 'Missing serial number';
          warrantyInfo.skipped = true;
        } else if (skipExistingForLookup && device.warrantyFetchedAt) {
          // Skip if device already has warranty info and skipExistingForLookup is true
          logger.debug(`Skipping ${device.serialNumber} (lookup) - already has warranty info`, 'warranty-lookup', {
            serialNumber: device.serialNumber,
            warrantyFetchedAt: device.warrantyFetchedAt
          });
          warrantyInfo = {
            ...deviceToWarrantyInfo(device),
            skipped: true,
            fromCache: true,
          };
        } else {
          // Fetch warranty information for this device
          logger.info(`Processing warranty lookup for device: ${device.serialNumber}`, 'warranty-lookup', {
            serialNumber: device.serialNumber,
            manufacturer: device.manufacturer,
            deviceIndex: i + 1,
            totalDevices
          });
          warrantyInfo = await fetchAndStoreDeviceWarranty(device, manufacturerCreds);
        }
      } catch (e) {
        logger.error(`Critical error processing device ${device.serialNumber}: ${e}`, 'warranty-lookup', {
          serialNumber: device.serialNumber,
          deviceIndex: i + 1,
          error: e instanceof Error ? e.message : String(e)
        });
        warrantyInfo = deviceToWarrantyInfo(device);
        warrantyInfo.error = true;
        warrantyInfo.errorMessage = e instanceof Error ? e.message : 'Individual device processing failed';
        warrantyInfo.skipped = true;
      }

      results.push(warrantyInfo);

      // Update UI with individual device result
      onDeviceResult?.(warrantyInfo, i, totalDevices);

      // Update progress after each device
      const progress = Math.round(((i + 1) / totalDevices) * 95) + 5; // 5% to 100%
      onProgress?.(progress);
    }
    // Artificial delay of 100ms to show the progress bar in case all devices are skipped
    await new Promise(resolve => setTimeout(resolve, 100));

    onProgress?.(100); // Complete

    return {
      results,
      success: true
    };
  } catch (error) {
    logger.error(`Warranty lookup failed: ${error}`, 'warranty-lookup', {
      error: error instanceof Error ? error.message : String(error)
    });
    const errorResults = devices.map(d => ({
      ...deviceToWarrantyInfo(d),
      error: true,
      errorMessage: (error instanceof Error ? error.message : 'Overall lookup processing failed'),
    }));
    
    return {
      results: errorResults,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 