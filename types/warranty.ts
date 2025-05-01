import { Manufacturer } from './manufacturer';

export interface WarrantyInfo {
  serialNumber: string;
  manufacturer: Manufacturer;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'unknown';
  productDescription?: string;
  coverageDetails?: string[];
} 