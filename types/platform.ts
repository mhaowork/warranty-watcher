export enum Platform {
  DATTO_RMM = 'DattoRMM',
  NCENTRAL = 'N-central',
  CSV = 'CSV'
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