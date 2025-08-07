'use server';

import { ManufacturerCredentials } from "@/types/credentials";
import { Manufacturer } from "@/types/manufacturer";

export async function getManufacturerCredentialsFromEnvs(): Promise<ManufacturerCredentials> {
  return {
    [Manufacturer.DELL]: {
      clientId: process.env.DELL_API_CLIENT_ID || '',
      clientSecret: process.env.DELL_API_CLIENT_SECRET || '',
    },
    [Manufacturer.HP]: {
      apiKey: process.env.HP_API_KEY || '',
    },
    [Manufacturer.LENOVO]: {
      apiKey: process.env.LENOVO_API_KEY || '',
    },
  };
}