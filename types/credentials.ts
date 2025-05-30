import { Manufacturer } from './manufacturer';

export interface DellCredentials {
  clientId: string;
  clientSecret: string;
  // Add other Dell-specific fields if any
}

export interface HPCredentials {
  apiKey: string;
  // Add other HP-specific fields if any
}

export interface LenovoCredentials {
  apiKey: string;
  // Add other Lenovo-specific fields if any
}

// Add other manufacturer credential interfaces as needed

export interface ManufacturerCredentials {
  [Manufacturer.DELL]?: DellCredentials;
  [Manufacturer.HP]?: HPCredentials;
  [Manufacturer.LENOVO]?: LenovoCredentials;
  // Add other manufacturers here
} 