import { WarrantyInfo } from '../../types/warranty';

export interface ManufacturerApiClient {
  getWarrantyInfo(serialNumber: string, credentials: any): Promise<WarrantyInfo>;
} 