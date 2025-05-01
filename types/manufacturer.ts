export enum Manufacturer {
  DELL = 'dell',
  HP = 'hp'
  // Future manufacturers would be added here
}

export interface ManufacturerCredentials {
  [Manufacturer.DELL]: {
    apiKey: string;
    clientId?: string;
  };
  [Manufacturer.HP]: {
    apiKey?: string;
  };
} 