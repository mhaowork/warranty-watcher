export enum Platform {
  DATTO_RMM = 'datto_rmm',
  CSV = 'csv'
  // Future platforms would be added here
}

export interface PlatformCredentials {
  [Platform.DATTO_RMM]: {
    url: string;
    apiKey: string;
    secretKey: string;
  };
  [Platform.CSV]: object;
} 