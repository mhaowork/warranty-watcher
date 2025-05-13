import { Manufacturer } from './manufacturer';

export interface NetworkInterface {
  macAddress: string;
  ipv4?: string;
  ipv6?: string;
}

export interface Device {
  serialNumber: string;
  manufacturer: Manufacturer;
  model?: string;
  hostname?: string;
  clientId?: string;
  clientName?: string;
  
  // Fields for devices that already have warranty info
  hasWarrantyInfo?: boolean;
  warrantyStartDate?: string; // YYYY-MM-DD
  warrantyEndDate?: string; // YYYY-MM-DD
  id?: string; // For source system identification

  // System information
  totalMemory?: number;
  totalCpuCores?: number;
  networkInterfaces?: NetworkInterface[];
} 