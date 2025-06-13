'use client';

import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getManufacturerCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import { fetchAndStoreDeviceWarranty } from '@/lib/services/warrantySync';

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
  
  if (!devices.length) {
    return {
      results: [],
      success: false,
      error: 'No devices provided to process for warranty lookup.'
    };
  }

  try {
    const manufacturerCreds = getManufacturerCredentials();
    
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
          console.warn(`Skipping device ID ${device.id || 'N/A'} due to missing serial number.`);
          warrantyInfo = deviceToWarrantyInfo(device);
          warrantyInfo.error = true;
          warrantyInfo.errorMessage = 'Missing serial number';
          warrantyInfo.skipped = true;
        } else if (skipExistingForLookup && device.warrantyFetchedAt) {
          // Skip if device already has warranty info and skipExistingForLookup is true
          console.log(`Skipping ${device.serialNumber} (lookup) - already has warranty info`);
          warrantyInfo = {
            ...deviceToWarrantyInfo(device),
            skipped: true,
            fromCache: true,
          };
        } else {
          // Fetch warranty information for this device
          warrantyInfo = await fetchAndStoreDeviceWarranty(device, manufacturerCreds);
        }
      } catch (e) {
        console.error(`Critical error processing device ${device.serialNumber}:`, e);
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
    console.error('Warranty lookup failed:', error);
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