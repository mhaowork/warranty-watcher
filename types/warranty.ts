import { Manufacturer } from './manufacturer';

export interface WarrantyInfo {
  serialNumber: string;
  hostname?: string;        // Device hostname/name
  clientName?: string;      // Client/customer name
  manufacturer: Manufacturer;
  startDate: string;
  endDate: string;
  productDescription?: string;
  coverageDetails?: string[];
  
  // Additional fields for tracking sync status
  writtenBack?: boolean;    // Whether this info was written back to the source
  skipped?: boolean;        // Whether this device was skipped due to existing info
  error?: boolean;          // Whether there was an error processing this device
  fromCache?: boolean;      // Whether this info was retrieved from local database
  lastUpdated?: string;     // ISO datetime when warranty was last fetched from API
  deviceSource?: string;    // Platform where device originally came from (CSV, Datto RMM, etc.)
  errorMessage?: string;    // For displaying specific error messages
} 