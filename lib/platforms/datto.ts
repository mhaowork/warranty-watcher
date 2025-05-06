import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

interface DattoCredentials {
  url?: string;
  apiKey?: string;
  secretKey?: string;
}

// Datto RMM API types
interface SystemInfo {
  manufacturer: string;
  model: string;
  totalPhysicalMemory: number;
  username: string;
  dotNetVersion: string;
  totalCpuCores: number;
}

interface Bios {
  instance: string;
  releaseDate: string;
  serialNumber: string;
  smBiosVersion: string;
}

interface BaseBoard {
  manufacturer: string;
  product: string;
}

interface DeviceAudit {
  portalUrl: string;
  webRemoteUrl: string;
  systemInfo: SystemInfo;
  bios: Bios;
  baseBoard: BaseBoard;
  // Other fields omitted for brevity
}

interface DattoDevice {
  id: number;
  uid: string;
  hostname: string;
  description: string;
  deviceClass: string;
  deviceType: string;
  online: boolean;
  siteName: string;
  siteUid: string;
  // Other fields omitted for brevity
}

interface DevicesPage {
  pageDetails: {
    pageNumber: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  devices: DattoDevice[];
}

interface Site {
  id: number;
  uid: string;
  name: string;
  description: string;
  deviceCount: number;
}

interface SitesPage {
  pageDetails: {
    pageNumber: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  sites: Site[];
}

/**
 * Fetches devices from Datto RMM
 * 
 * This function can operate in two modes:
 * 1. Demo mode - returns mock data (when credentials are incomplete)
 * 2. Real API mode - calls the Datto RMM API (when complete credentials are provided)
 * 
 * Example usage:
 * 
 * // To use real API:
 * const devices = await fetchDattoDevices({
 *   url: 'https://your-datto-url.com/api',
 *   apiKey: 'your-api-key',
 *   secretKey: 'your-secret-key'
 * });
 * 
 * // To use demo mode:
 * const devices = await fetchDattoDevices({
 *   // Missing or incomplete credentials will trigger demo mode
 * });
 */
export async function fetchDattoDevices(credentials?: DattoCredentials): Promise<Device[]> {
  try {
    // Use default or provided credentials
    const url = credentials?.url || 'https://demo-datto-rmm.com/api';
    const apiKey = credentials?.apiKey || '';
    const secretKey = credentials?.secretKey || '';
    
    // Determine if we should use real API based on whether we have complete credentials
    const useRealApi = Boolean(credentials?.url && credentials?.apiKey && credentials?.secretKey);

    console.log(`Connecting to Datto RMM at ${url} ${!useRealApi ? '(DEMO MODE)' : ''}`);

    // If using demo mode, return mock data
    if (!useRealApi) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return mock data
      return [
        {
          id: 'dev-1',
          serialNumber: 'DELL00123456',
          manufacturer: Manufacturer.DELL,
          model: 'Latitude 5420',
          hostname: 'DESKTOP-ABCDE1',
          clientId: 'CLIENT-1',
          clientName: 'Acme Corporation'
        },
        {
          id: 'dev-2',
          serialNumber: 'HP00789012',
          manufacturer: Manufacturer.HP,
          model: 'EliteBook 840 G8',
          hostname: 'DESKTOP-FGHIJ2',
          clientId: 'CLIENT-1',
          clientName: 'Acme Corporation',
          // This device already has warranty info
          hasWarrantyInfo: true,
          warrantyStartDate: '2022-01-15',
          warrantyEndDate: '2058-01-15'
        },
        {
          id: 'dev-3',
          serialNumber: 'DELL00345678',
          manufacturer: Manufacturer.DELL,
          model: 'OptiPlex 7080',
          hostname: 'DESKTOP-KLMNO3',
          clientId: 'CLIENT-2',
          clientName: 'TechNova Solutions'
        },
        {
          id: 'dev-4',
          serialNumber: 'HP00901234',
          manufacturer: Manufacturer.HP,
          model: 'ProBook 450 G8',
          hostname: 'DESKTOP-PQRST4',
          clientId: 'CLIENT-2',
          clientName: 'TechNova Solutions',
          // This device already has warranty info (expired)
          hasWarrantyInfo: true,
          warrantyStartDate: '2020-03-10',
          warrantyEndDate: '2023-03-10'
        },
        {
          id: 'dev-5',
          serialNumber: 'DELL00567890',
          manufacturer: Manufacturer.DELL,
          model: 'XPS 13',
          hostname: 'LAPTOP-UVWXY5',
          clientId: 'CLIENT-3',
          clientName: 'Global Enterprises'
        },
        {
          id: 'dev-6',
          serialNumber: 'HP00123456',
          manufacturer: Manufacturer.HP,
          model: 'EliteBook x360',
          hostname: 'LAPTOP-ZABCD6',
          clientId: 'CLIENT-3',
          clientName: 'Global Enterprises'
        },
        {
          id: 'dev-7',
          serialNumber: 'DELL00789012',
          manufacturer: Manufacturer.DELL,
          model: 'Precision 5550',
          hostname: 'WORKSTATION-EFGHI7',
          clientId: 'CLIENT-3',
          clientName: 'Global Enterprises'
        },
        {
          id: 'dev-8',
          serialNumber: 'HP00345678',
          manufacturer: Manufacturer.HP,
          model: 'ZBook Studio G7',
          hostname: 'WORKSTATION-JKLMN8',
          clientId: 'CLIENT-4',
          clientName: 'Innovative Tech'
        },
        {
          id: 'dev-9',
          serialNumber: 'DELL00901234',
          manufacturer: Manufacturer.DELL,
          model: 'Latitude 7420',
          hostname: 'LAPTOP-OPQRS9',
          clientId: 'CLIENT-4',
          clientName: 'Innovative Tech'
        },
        {
          id: 'dev-10',
          serialNumber: 'HP00567890',
          manufacturer: Manufacturer.HP,
          model: 'EliteDesk 800 G6',
          hostname: 'DESKTOP-TUVWX10',
          clientId: 'CLIENT-4',
          clientName: 'Innovative Tech'
        }
      ];
    }

    // Otherwise, use the real API
    const client = await createDattoRMMClient(url, apiKey, secretKey);
    return await fetchDevicesUsingRealAPI(client);
  } catch (error) {
    console.error('Error fetching devices from Datto RMM:', error);
    return [];
  }
}

// REAL API IMPLEMENTATION

/**
 * Creates an authenticated Datto RMM API client
 */
async function createDattoRMMClient(apiUrl: string, apiKey: string, secretKey: string): Promise<AxiosInstance> {
  // Create axios instance with base URL and default headers
  const client = axios.create({
    baseURL: apiUrl,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Add request interceptor for authentication
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // In a real implementation, you would create an HMAC signature here using the secretKey and timestamp
    // const hmacMessage = `${apiKey}${timestamp}`;
    const hmacSignature = secretKey ? `hmac-sha1-${secretKey.substring(0, 6)}...` : "HMAC_SIGNATURE_PLACEHOLDER";

    // Create headers properly for axios 1.x
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    config.headers.set('Authorization', `Bearer ${apiKey}`);
    config.headers.set('X-Datto-Api-Key', apiKey);
    config.headers.set('X-Datto-Timestamp', timestamp);
    config.headers.set('X-Datto-Signature', hmacSignature);

    return config;
  });

  return client;
}

/**
 * Fetch all sites from Datto RMM
 */
async function getSites(client: AxiosInstance): Promise<Site[]> {
  try {
    // Get first page
    const response = await client.get<SitesPage>('/v2/site', {
      params: {
        pageSize: 100,
        page: 1
      }
    });

    let sites = response.data.sites;
    const totalPages = response.data.pageDetails.totalPages;

    // If more than one page, fetch the rest
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        const nextPage = await client.get<SitesPage>('/v2/site', {
          params: {
            pageSize: 100,
            page
          }
        });
        sites = [...sites, ...nextPage.data.sites];
      }
    }

    return sites;
  } catch (error) {
    console.error('Error fetching Datto RMM sites:', error);
    throw error;
  }
}

/**
 * Fetch devices for a specific site
 */
async function getDevicesBySite(client: AxiosInstance, siteUid: string): Promise<DattoDevice[]> {
  try {
    // Get first page
    const response = await client.get<DevicesPage>(`/v2/site/${siteUid}/devices`, {
      params: {
        pageSize: 100,
        page: 1
      }
    });

    let devices = response.data.devices;
    const totalPages = response.data.pageDetails.totalPages;

    // If more than one page, fetch the rest
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        const nextPage = await client.get<DevicesPage>(`/v2/site/${siteUid}/devices`, {
          params: {
            pageSize: 100,
            page
          }
        });
        devices = [...devices, ...nextPage.data.devices];
      }
    }

    return devices;
  } catch (error) {
    console.error(`Error fetching Datto RMM devices for site ${siteUid}:`, error);
    throw error;
  }
}

/**
 * Fetch device audit data
 */
async function getDeviceAudit(client: AxiosInstance, deviceUid: string): Promise<DeviceAudit> {
  try {
    const response = await client.get<DeviceAudit>(`/v2/device/${deviceUid}/audit`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Datto RMM device audit for device ${deviceUid}:`, error);
    throw error;
  }
}

/**
 * Main function to fetch devices using the real Datto RMM API
 */
async function fetchDevicesUsingRealAPI(client: AxiosInstance): Promise<Device[]> {
  try {
    const sites = await getSites(client);
    const result: Device[] = [];

    // For each site, get devices and audit data
    for (const site of sites) {
      const devices = await getDevicesBySite(client, site.uid);

      // For each device, get audit data and map to Device format
      for (const device of devices) {
        try {
          const audit = await getDeviceAudit(client, device.uid);

          // Determine manufacturer enum
          let manufacturer = Manufacturer.DELL;
          const mfgName = (audit.systemInfo.manufacturer || '').toLowerCase();

          if (mfgName.includes('dell')) {
            manufacturer = Manufacturer.DELL;
          } else if (mfgName.includes('hp') || mfgName.includes('hewlett')) {
            manufacturer = Manufacturer.HP;
          }

          // Map to our normalized Device format
          const mappedDevice: Device = {
            id: device.uid,
            hostname: device.hostname,
            manufacturer: manufacturer,
            model: audit.systemInfo.model || '',
            serialNumber: audit.bios.serialNumber || '',
            clientId: site.uid,
            clientName: site.name
          };

          result.push(mappedDevice);
        } catch (error) {
          console.error(`Error processing device ${device.hostname} (${device.uid}):`, error);
          // Continue with next device even if this one fails
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching all Datto RMM devices:', error);
    throw error;
  }
} 