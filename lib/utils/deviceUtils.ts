import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { inferWarrantyStatus } from './warrantyUtils';

// Helper function to convert Device to WarrantyInfo for display
export function deviceToWarrantyInfo(device: Device): WarrantyInfo {
  return {
    serialNumber: device.serialNumber,
    manufacturer: device.manufacturer,
    startDate: device.warrantyStartDate || '',
    endDate: device.warrantyEndDate || '',
    status: inferWarrantyStatus(device.warrantyEndDate),
    productDescription: device.model || 'Unknown',
    fromCache: !!device.warrantyFetchedAt,
    writtenBack: !!device.warrantyWrittenBackAt,
    lastUpdated: device.warrantyFetchedAt ? new Date(device.warrantyFetchedAt * 1000).toISOString() : undefined,
    deviceSource: device.sourcePlatform || 'Unknown'
  };
} 