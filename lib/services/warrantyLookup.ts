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
    
    onProgress?.(10); // Progress after initial setup

    const response = await fetch('/api/warranty/fetch-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devices: devices,
        credentials: manufacturerCreds,
        skipExistingForLookup: skipExistingForLookup,
      }),
    });

    onProgress?.(50); // Progress after API call initiated

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Batch warranty fetch failed with status: ${response.status}`);
    }

    const batchApiResults: WarrantyInfo[] = await response.json();
    
    onProgress?.(100); // Lookup complete

    return {
      results: batchApiResults,
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