export enum Manufacturer {
  DELL = 'dell',
  HP = 'hp'
  // Future manufacturers would be added here
}

export interface ManufacturerCredentials {
  [Manufacturer.DELL]: {
    clientId: string;
    clientSecret: string;
  };
  [Manufacturer.HP]: {
    apiKey?: string;
  };
} 