import { Manufacturer } from './manufacturer';

export interface Device {
  serialNumber: string;
  manufacturer: Manufacturer;
  model?: string;
  hostname?: string;
  clientId?: string;
  clientName?: string;
  
  // Fields for devices that already have warranty info
  hasWarrantyInfo?: boolean;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyStatus?: 'active' | 'expired' | 'unknown';
  id?: string; // For source system identification
} 