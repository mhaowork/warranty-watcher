export enum Platform {
  DATTO_RMM = 'datto_rmm',
  NCENTRAL = 'ncentral',
  CSV = 'csv'
  // Future platforms would be added here
}

export interface PlatformCredentials {
  [Platform.DATTO_RMM]?: {
    url?: string;
    apiKey?: string;
    secretKey?: string;
  };
  [Platform.NCENTRAL]?: {
    serverUrl?: string;
    apiToken?: string;
  };
  [Platform.CSV]?: object;
} 