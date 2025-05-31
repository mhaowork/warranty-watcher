import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getManufacturerCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';

export interface WarrantyLookupOptions {
  skipExistingForLookup: boolean;
  onProgress?: (progress: number) => void;
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
  const { skipExistingForLookup, onProgress } = options;
  
  if (!devices.length) {
    return {
      results: [],
      success: false,
      error: 'No devices provided to process for warranty lookup.'
    };
  }

  try {
    const manufacturerCreds = getManufacturerCredentials();
    const devicesForBatchLookup: Device[] = [];
    const finalResults: WarrantyInfo[] = []; // To accumulate results including skipped ones

    // Step 1: Filter devices for lookup
    for (const device of devices) {
      if (skipExistingForLookup && device.warrantyFetchedAt) {
        console.log(`Skipping ${device.serialNumber} (lookup) - already has warranty info`);
        finalResults.push({
          ...deviceToWarrantyInfo(device),
          skipped: true,
          fromCache: true,
          isLoadingWarranty: false,
        });
        continue;
      }

      if (!device.serialNumber) {
        console.log(`Skipping device ID ${device.id || 'N/A'} (lookup) - no serial number`);
        finalResults.push({
          serialNumber: device.serialNumber || 'N/A',
          manufacturer: device.manufacturer,
          startDate: '',
          endDate: '',
          productDescription: device.model,
          skipped: true,
          error: true,
          errorMessage: 'Missing serial number for lookup',
          fromCache: false,
          lastUpdated: undefined,
          deviceSource: device.sourcePlatform || 'Unknown',
          isLoadingWarranty: false,
        });
        continue;
      }
      devicesForBatchLookup.push(device);
    }
    
    onProgress?.(10); // Progress after initial filtering

    // Step 2: Call Batch Warranty API if there are devices to look up
    if (devicesForBatchLookup.length > 0) {
      console.log(`Fetching warranty for ${devicesForBatchLookup.length} devices in batch.`);
      const response = await fetch('/api/warranty/fetch-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices: devicesForBatchLookup,
          credentials: manufacturerCreds,
        }),
      });

      onProgress?.(50); // Progress after API call initiated

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Batch warranty fetch failed with status: ${response.status}`);
      }

      const batchApiResults: WarrantyInfo[] = await response.json();
      
      const apiResultsMap = new Map<string, WarrantyInfo>();
      batchApiResults.forEach(res => apiResultsMap.set(res.serialNumber, res));

      devicesForBatchLookup.forEach(device => {
        const apiResult = apiResultsMap.get(device.serialNumber);
        if (apiResult) {
          finalResults.push({
            ...apiResult,
            deviceSource: device.sourcePlatform || 'Unknown',
            isLoadingWarranty: false,
          });
        } else {
          // This case should ideally be handled by the API returning an error for this device
          console.warn(`No batch API result for ${device.serialNumber}, marking as error.`);
          finalResults.push({
            serialNumber: device.serialNumber,
            manufacturer: device.manufacturer,
            startDate: '',
            endDate: '',
            error: true,
            errorMessage: 'No result from batch API or error during fetch',
            fromCache: false,
            lastUpdated: undefined,
            deviceSource: device.sourcePlatform || 'Unknown',
            isLoadingWarranty: false,
          });
        }
      });
    }
    
    // Ensure finalResults contains entries for all original devices, preserving order
    const orderedFinalResults: WarrantyInfo[] = [];
    const finalResultsMap = new Map<string, WarrantyInfo>();
    finalResults.forEach(r => r.serialNumber && finalResultsMap.set(r.serialNumber, r));

    for (const originalDevice of devices) {
      const result = finalResultsMap.get(originalDevice.serialNumber);
      if (result) {
        orderedFinalResults.push(result);
      } else if (!originalDevice.serialNumber && (!skipExistingForLookup || !originalDevice.warrantyFetchedAt)) {
        // This condition handles devices that were initially skipped due to no SN,
        // and weren't caught by the skipExistingForLookup if it was also missing warranty.
         orderedFinalResults.push({
          serialNumber: originalDevice.serialNumber || 'N/A',
          manufacturer: originalDevice.manufacturer,
          startDate: '',
          endDate: '',
          productDescription: originalDevice.model,
          skipped: true, // Marked as skipped because it couldn't be processed
          error: true,
          errorMessage: 'Missing serial number',
          fromCache: false,
          lastUpdated: undefined,
          deviceSource: originalDevice.sourcePlatform || 'Unknown',
          isLoadingWarranty: false,
        });
      }
    }
    
    onProgress?.(100); // Lookup complete

    return {
      results: orderedFinalResults.map(r => ({...r, isLoadingWarranty: false})),
      success: true
    };
  } catch (error) {
    console.error('Warranty lookup failed:', error);
    const errorResults = devices.map(d => ({
      ...deviceToWarrantyInfo(d),
      error: true,
      errorMessage: (error instanceof Error ? error.message : 'Overall lookup processing failed'),
      isLoadingWarranty: false,
    }));
    
    return {
      results: errorResults,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 