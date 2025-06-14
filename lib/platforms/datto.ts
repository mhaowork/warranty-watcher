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
  warrantyDate?: string;
  siteName?: string; // Client name for Datto RMM
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
          model: 'Latitude 5420 (mock data)',
          hostname: 'DESKTOP-ABCDE1'
        },
        {
          id: 'dev-2',
          serialNumber: 'HP00789012',
          manufacturer: Manufacturer.HP,
          model: 'EliteBook 840 G8 (mock data)',
          hostname: 'DESKTOP-FGHIJ2',
          // This device already has warranty info
          warrantyEndDate: '2025-01-15'
        },
        {
          id: 'dev-3',
          serialNumber: 'DELL00345678',
          manufacturer: Manufacturer.DELL,
          model: 'OptiPlex 7080 (mock data)',
          hostname: 'DESKTOP-KLMNO3'
        },
        {
          id: 'dev-4',
          serialNumber: 'HP00901234',
          manufacturer: Manufacturer.HP,
          model: 'ProBook 450 G8 (mock data)',
          hostname: 'DESKTOP-PQRST4',
          // This device already has warranty info (expired)
          warrantyEndDate: '2023-03-10'
        },
        {
          id: 'dev-5',
          serialNumber: 'LR0394B2',
          manufacturer: Manufacturer.LENOVO,
          model: 'ThinkPad X1 Carbon (mock data)',
          hostname: 'LAPTOP-UVWXY5'
        },
        {
          id: 'dev-6',
          serialNumber: 'R9NOY12',
          manufacturer: Manufacturer.LENOVO,
          model: 'ThinkPad P1 (mock data)',
          hostname: 'LAPTOP-ZABCD6'
        },
        {
          id: 'dev-7',
          serialNumber: 'DELL00789012',
          manufacturer: Manufacturer.DELL,
          model: 'Precision 5550 (mock data)',
          hostname: 'WORKSTATION-EFGHI7'
        },
        {
          id: 'dev-8',
          serialNumber: 'HP00345678',
          manufacturer: Manufacturer.HP,
          model: 'ZBook Studio G7 (mock data)',
          hostname: 'WORKSTATION-JKLMN8'
        },
        {
          id: 'dev-9',
          serialNumber: 'MP1DU39T',
          manufacturer: Manufacturer.LENOVO,
          model: 'ThinkPad T14 (mock data)',
          hostname: 'LAPTOP-OPQRS9'
        },
        {
          id: 'dev-10',
          serialNumber: 'PF2BXTWK',
          manufacturer: Manufacturer.LENOVO,
          model: 'ThinkCentre M70q',
          hostname: 'DESKTOP-TUVWX10',
          // This device has a warranty set to 2026
          warrantyEndDate: '2026-10-01'
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

    console.log(`Processing ${devices.length} devices from Datto RMM...`);

    // Process each device
    for (const device of devices) {
      try {
        // Skip non-device class items (printers, esxihosts, etc)
        if (device.deviceClass !== 'device') {
          console.log(`Skipping non-device class item: ${device.hostname} (${device.deviceClass})`);
          continue;
        }

        console.log(`\nProcessing device: ${device.hostname} (ID: ${device.uid})`);
        
        // Log warranty date from device object
        console.log(`Warranty date from Datto RMM: ${device.warrantyDate || 'Not set'}`);
        
        const audit = await getDeviceAudit(client, device.uid);

        // Determine manufacturer enum
        let manufacturer = Manufacturer.DELL;
        const mfgName = (audit.systemInfo.manufacturer || '').toLowerCase();

        if (mfgName.includes('dell')) {
          manufacturer = Manufacturer.DELL;
        } else if (mfgName.includes('hp') || mfgName.includes('hewlett')) {
          manufacturer = Manufacturer.HP;
        }

        // Check for warranty information from Datto RMM
        let warrantyEndDate: string | undefined = undefined;
        
        // Check for warranty info in device data (primary) or audit data (fallback)
        if (device.warrantyDate) {
          warrantyEndDate = device.warrantyDate;
          console.log(`Found warranty end date from device data: ${warrantyEndDate}`);
        } else if (audit.warrantyInfo && audit.warrantyInfo.warrantyEndDate) {
          warrantyEndDate = audit.warrantyInfo.warrantyEndDate;
          console.log(`Found warranty end date from audit data: ${warrantyEndDate}`);
        }

        // Map to our normalized Device format
        const mappedDevice: Device = {
          id: device.uid,
          serialNumber: audit.bios.serialNumber || '',
          manufacturer: manufacturer,
          model: audit.systemInfo.model || '',
          hostname: device.hostname,
          clientName: device.siteName,
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

/**
 * Updates a device's warranty expiration date in Datto RMM
 * 
 * This function can operate in two modes:
 * 1. Demo mode - simulates updating warranty info (when credentials are incomplete)
 * 2. Real API mode - calls the Datto RMM API (when complete credentials are provided)
 * 
 * @param deviceUid The Datto device UID to update
 * @param warrantyEndDate The warranty expiration date in ISO format (YYYY-MM-DD)
 * @param credentials Optional Datto credentials
 * @returns True if update was successful, false otherwise
 */
export async function updateDattoWarranty(
  deviceUid: string, 
  warrantyEndDate: string, 
  credentials?: DattoCredentials
): Promise<boolean> {
  try {
    // Use default or provided credentials
    const url = credentials?.url || '';
    const apiKey = credentials?.apiKey || '';
    const secretKey = credentials?.secretKey || '';
    
    // Determine if we should use real API based on whether we have complete credentials
    const useRealApi = Boolean(credentials?.url && credentials?.apiKey && credentials?.secretKey);

    console.log(`Updating warranty for Datto device ${deviceUid} to ${warrantyEndDate} ${!useRealApi ? '(DEMO MODE)' : ''}`);

    // If using demo mode, simulate update
    if (!useRealApi) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`[DEMO] Successfully updated warranty date for device ${deviceUid} to ${warrantyEndDate}`);
      return true;
    }

    // Use the real API
    const client = await createDattoRMMClient(url, apiKey, secretKey);
    
    // Call the Datto RMM API to update the warranty date
    const response = await client.post(`/v2/device/${deviceUid}/warranty`, {
      warrantyDate: warrantyEndDate
    });
    
    // Check if the update was successful
    if (response.status >= 200 && response.status < 300) {
      console.log(`Successfully updated warranty expiration date for device ${deviceUid} to ${warrantyEndDate}`);
      return true;
    } else {
      console.error(`Failed to update warranty for device ${deviceUid}: Unexpected status code ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error updating warranty for device ${deviceUid}:`, error.message);
    } else {
      console.error(`Unknown error updating warranty for device ${deviceUid}:`, error);
    }
    return false;
  }
} 