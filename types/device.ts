import { Manufacturer } from './manufacturer';

export interface NetworkInterface {
  macAddress: string;
  ipv4?: string;
  ipv6?: string;
}

export interface Device {
  id?: string; // Primary key for database
  serialNumber: string;
  manufacturer: Manufacturer;
  model?: string;
  hostname?: string;
  clientId?: string;
  clientName?: string;
  deviceClass?: string;
  sourcePlatform?: string; // Which platform this device came from
  sourceDeviceId?: string; // ID in the source platform
  
  // Warranty information (integrated into device record)
  warrantyStartDate?: string; // YYYY-MM-DD
  warrantyEndDate?: string; // YYYY-MM-DD
  warrantyFetchedAt?: string; // ISO datetime when warranty was last fetched
  warrantyWrittenBackAt?: string; // ISO datetime when warranty was written back to source
  
  // Computed fields (not stored in DB, calculated at runtime)
  hasWarrantyInfo?: boolean;
  needsWarrantyLookup?: boolean;

  // System information (optional, from RMM platforms)
  totalMemory?: number;
  totalCpuCores?: number;
  networkInterfaces?: NetworkInterface[];
} 