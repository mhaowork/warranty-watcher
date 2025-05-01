import { Manufacturer } from './manufacturer';

export interface Device {
  serialNumber: string;
  manufacturer: Manufacturer;
  model?: string;
  hostname?: string;
  clientId?: string;
  clientName?: string;
} 