import { Device } from '../../types/device';

export interface PlatformConnector {
  fetchDevices(credentials: any): Promise<Device[]>;
} 