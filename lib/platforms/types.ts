import { Device } from '../../types/device';

export interface PlatformConnector {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchDevices(credentials: any): Promise<Device[]>;
} 