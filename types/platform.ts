export enum Platform {
  DATTO_RMM = 'DattoRMM',
  NCENTRAL = 'N-central',
  HALOPSA = 'HaloPSA',
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
  [Platform.HALOPSA]?: {
    url?: string;
    clientId?: string;
    clientSecret?: string;
  };
  [Platform.CSV]?: object;
} 