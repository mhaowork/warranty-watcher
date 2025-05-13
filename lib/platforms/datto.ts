import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance, AxiosError } from 'axios';

interface DattoCredentials {
  url?: string;
  apiKey?: string;
  secretKey?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Datto RMM API types
interface SystemInfo {
  manufacturer: string;
  model: string;
}

interface Bios {
  serialNumber: string;
}

interface DeviceAudit {
  systemInfo: SystemInfo;
  bios: Bios;
  warrantyInfo?: {
    warrantyStartDate?: string;
    warrantyEndDate?: string;
  };
}

interface DattoDevice {
  uid: string;
  hostname: string;
  deviceClass: string;
  warrantyExpirationDate?: string;
}

interface DevicesPage {
  pageDetails: {
    count: number;
    totalCount: number;
    prevPageUrl: string | null;
    nextPageUrl: string | null;
  };
  devices: DattoDevice[];
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
  // First get the OAuth token
  const tokenResponse = await axios.post<TokenResponse>(
    `${apiUrl}/auth/oauth/token`,
    `grant_type=password&username=${apiKey}&password=${secretKey}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: 'public-client',
        password: 'public'
      }
    }
  );

  const accessToken = tokenResponse.data.access_token;

  // Create axios instance with base URL and default headers
  const client = axios.create({
    baseURL: `${apiUrl}/api`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Add response interceptor for error handling
  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            console.error('Bad request:', error.response.data);
            throw new Error('Invalid request parameters');
          case 401:
            console.error('Unauthorized:', error.response.data);
            throw new Error('Authentication failed');
          case 403:
            console.error('Forbidden:', error.response.data);
            throw new Error('Insufficient permissions');
          case 404:
            console.error('Not found:', error.response.data);
            throw new Error('Resource not found');
          case 409:
            console.error('Conflict:', error.response.data);
            throw new Error('Concurrent modification conflict');
          case 500:
            console.error('Server error:', error.response.data);
            throw new Error('Internal server error');
          default:
            console.error('API error:', error.response.data);
            throw new Error('API request failed');
        }
      }
      throw error;
    }
  );

  return client;
}

/**
 * Fetch all devices from Datto RMM
 */
async function getAllDevices(client: AxiosInstance): Promise<DattoDevice[]> {
  try {
    // Get first page - using the correct endpoint and parameters!
    const response = await client.get<DevicesPage>('/v2/account/devices', {
      params: {
        max: 250,
        page: 0
      }
    });

    let devices = response.data.devices;
    const totalCount = response.data.pageDetails.totalCount;
    
    // If we have more devices than what we've fetched, we need more pages
    if (totalCount > devices.length && response.data.pageDetails.nextPageUrl) {
      // Extract page number from nextPageUrl
      const pageMatch = response.data.pageDetails.nextPageUrl.match(/page=(\d+)/);
      if (pageMatch && pageMatch[1]) {
        const nextPage = parseInt(pageMatch[1], 10);
        
        // Get next page
        const nextPageResponse = await client.get<DevicesPage>('/v2/account/devices', {
          params: {
            max: 250,
            page: nextPage
          }
        });
        
        devices = [...devices, ...nextPageResponse.data.devices];
      }
    }

    return devices;
  } catch (error) {
    console.error('Error fetching Datto RMM devices:', error);
    throw error;
  }
}

/**
 * Fetch device audit data
 */
async function getDeviceAudit(client: AxiosInstance, deviceUid: string): Promise<DeviceAudit> {
  try {
    const response = await client.get<DeviceAudit>(`/v2/audit/device/${deviceUid}`);
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
    const devices = await getAllDevices(client);
    const result: Device[] = [];

    // Process each device
    for (const device of devices) {
      try {
        // Skip non-device class items (printers, esxihosts, etc)
        if (device.deviceClass !== 'device') {
          console.log(`Skipping non-device class item: ${device.hostname} (${device.deviceClass})`);
          continue;
        }

        const audit = await getDeviceAudit(client, device.uid);

        // Determine manufacturer enum
        let manufacturer = Manufacturer.DELL;
        const mfgName = (audit.systemInfo.manufacturer || '').toLowerCase();

        if (mfgName.includes('dell')) {
          manufacturer = Manufacturer.DELL;
        } else if (mfgName.includes('hp') || mfgName.includes('hewlett')) {
          manufacturer = Manufacturer.HP;
        }

        // EXPERIMENTAL: This code attempts to extract warranty information 
        // from Datto RMM, but it's not confirmed if Datto actually stores this data.
        // These fields may not exist in the API response.
        let hasWarrantyInfo = false;
        let warrantyStartDate: string | undefined = undefined;
        let warrantyEndDate: string | undefined = undefined;
        
        // EXPERIMENTAL: Check for warranty info in device or audit data
        if (device.warrantyExpirationDate || 
            (audit.warrantyInfo && 
             (audit.warrantyInfo.warrantyEndDate || audit.warrantyInfo.warrantyStartDate))) {
          
          hasWarrantyInfo = true;
          console.log(`EXPERIMENTAL: Found warranty info for device ${device.hostname}`);
          
          // EXPERIMENTAL: Extract warranty dates if available
          if (device.warrantyExpirationDate) {
            warrantyEndDate = device.warrantyExpirationDate;
            console.log(`EXPERIMENTAL: Found warranty end date from device data: ${warrantyEndDate}`);
          } else if (audit.warrantyInfo) {
            if (audit.warrantyInfo.warrantyEndDate) {
              warrantyEndDate = audit.warrantyInfo.warrantyEndDate;
              console.log(`EXPERIMENTAL: Found warranty end date from audit data: ${warrantyEndDate}`);
            }
            
            if (audit.warrantyInfo.warrantyStartDate) {
              warrantyStartDate = audit.warrantyInfo.warrantyStartDate;
              console.log(`EXPERIMENTAL: Found warranty start date from audit data: ${warrantyStartDate}`);
            }
          }
        }

        // Map to our normalized Device format
        const mappedDevice: Device = {
          id: device.uid,
          serialNumber: audit.bios.serialNumber || '',
          manufacturer: manufacturer,
          hasWarrantyInfo: hasWarrantyInfo,
          warrantyStartDate: warrantyStartDate,
          warrantyEndDate: warrantyEndDate
        };

        result.push(mappedDevice);
      } catch (error) {
        console.error(`Error processing device ${device.hostname} (${device.uid}):`, error);
        // Continue with next device even if this one fails
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching all Datto RMM devices:', error);
    throw error;
  }
} 