import { Manufacturer } from './manufacturer';

export interface WarrantyInfo {
  serialNumber: string;
  manufacturer: Manufacturer;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'unknown';
  productDescription?: string;
  coverageDetails?: string[];
  
  // Additional fields for tracking sync status
  writtenBack?: boolean;    // Whether this info was written back to the source
  skipped?: boolean;        // Whether this device was skipped due to existing info
  error?: boolean;          // Whether there was an error processing this device
} 