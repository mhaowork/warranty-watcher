import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance } from 'axios';

interface NCentralCredentials {
  serverUrl?: string;
  apiToken?: string;
}

// N-central API types
interface DeviceAsset {
  os?: {
    reportedos?: string;
    osarchitecture?: string;
    version?: string;
  };
  computersystem?: {
    serialnumber?: string;
    netbiosname?: string;
    model?: string;
    totalphysicalmemory?: string;
    manufacturer?: string;
  };
  device?: {
    longname?: string;
    deleted?: string;
    lastlogin?: string;
    deviceclass?: string;
    deviceid?: string;
    uri?: string;
  };
  processor?: {
    name?: string;
    numberofcores?: string;
    numberofcpus?: string;
  };
  networkadapter?: {
    list?: Array<{
      ipaddress?: string;
      _index?: number;
      dnsserver?: string;
      description?: string;
      dhcpserver?: string | null;
      macaddress?: string;
      gateway?: string;
    }>;
  };
  _extra?: {
    [key: string]: unknown;
  };
}

// Interface for Device response
interface NCentralDeviceResponse {
  data: NCentralDeviceItem[];
  pageDetails?: {
    pageNumber: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Interface for Device item in response
interface NCentralDeviceItem {
  id: number;
  name?: string;
  description?: string;
  orgUnitId?: number;
  [key: string]: unknown;
}

// Interface for Organization Unit response
interface NCentralOrgUnitResponse {
  data: {
    id: number;
    name: string;
    type?: string;
    description?: string;
    [key: string]: unknown;
  };
}

/**
 * Fetches devices from N-central
 * 
 * This function can operate in two modes:
 * 1. Demo mode - returns mock data (default)
 * 2. Real API mode - calls the N-central API (when credentials are provided)
 */
export async function fetchNCentralDevices(credentials?: NCentralCredentials): Promise<Device[]> {
  try {
    // Use default or provided credentials
    const serverUrl = credentials?.serverUrl || 'https://your-ncentral-server.com';
    const apiToken = credentials?.apiToken || 'demo-api-token';
    const useRealApi = Boolean(credentials?.serverUrl && credentials?.apiToken);

    console.log(`Connecting to N-central at ${serverUrl}`);

    // If using demo mode, return mock data
    if (!useRealApi) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return mock data
      return [
        {
          id: 'nc-1',
          serialNumber: 'DELL00987654',
          manufacturer: Manufacturer.DELL,
          model: 'OptiPlex 7070',
          hostname: 'NCENTRAL-DEV1',
          clientId: 'NC-CLIENT-1',
          clientName: 'Worldwide Enterprises'
        },
        {
          id: 'nc-2',
          serialNumber: 'HP00654321',
          manufacturer: Manufacturer.HP,
          model: 'EliteBook 850 G7',
          hostname: 'NCENTRAL-DEV2',
          clientId: 'NC-CLIENT-1',
          clientName: 'Worldwide Enterprises'
        },
        {
          id: 'nc-3',
          serialNumber: 'DELL00135790',
          manufacturer: Manufacturer.DELL,
          model: 'Latitude 7400',
          hostname: 'NCENTRAL-DEV3',
          clientId: 'NC-CLIENT-2',
          clientName: 'Acme IT Solutions'
        },
        {
          id: 'nc-4',
          serialNumber: 'HP00246810',
          manufacturer: Manufacturer.HP,
          model: 'ProBook 440 G7',
          hostname: 'NCENTRAL-DEV4',
          clientId: 'NC-CLIENT-2',
          clientName: 'Acme IT Solutions',
          // This device already has warranty info
          hasWarrantyInfo: true,
          warrantyStartDate: '2022-05-20',
          warrantyEndDate: '2025-05-20'
        }
      ];
    }

    // Otherwise, use the real API
    const client = await createNCentralClient(serverUrl, apiToken);
    return await fetchDevicesUsingRealAPI(client);
  } catch (error) {
    console.error('Error fetching devices from N-central:', error);
    return [];
  }
}

// REAL API IMPLEMENTATION

/**
 * Creates an authenticated N-central API client
 */
async function createNCentralClient(serverUrl: string, apiToken: string): Promise<AxiosInstance> {
  // First, authenticate to get access token
  try {
    console.log('Authenticating with N-central at', serverUrl);
    const authResponse = await axios.post(`${serverUrl}/api/auth/authenticate`, {}, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Authentication response received');
    
    // Extract the access token from the nested response structure
    if (!authResponse.data?.tokens?.access?.token) {
      console.error('Access token not found in response');
      throw new Error('Access token not found in authentication response');
    }
    
    const accessToken = authResponse.data.tokens.access.token;
    console.log('Successfully obtained access token');
    
    // Create axios instance with base URL and default headers
    const client = axios.create({
      baseURL: serverUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return client;
  } catch (error) {
    console.error('Error authenticating with N-central:', error);
    throw error;
  }
}

/**
 * Fetches device asset information
 */
async function getDeviceAsset(client: AxiosInstance, deviceId: number): Promise<DeviceAsset> {
  try {
    const response = await client.get(`/api/devices/${deviceId}/assets`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching N-central device asset for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Main function to fetch devices using the real N-central API
 */
async function fetchDevicesUsingRealAPI(client: AxiosInstance): Promise<Device[]> {
  try {
    const result: Device[] = [];
    
    // Fetch all devices directly instead of iterating through org units
    let pageNumber = 1;
    const pageSize = 100;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        const response = await client.get<NCentralDeviceResponse>('/api/devices', {
          params: {
            pageSize,
            pageNumber
          }
        });
        
        const devices = response.data.data || [];

        console.log('Devices:', devices);
        
        // Process each device
        for (const device of devices) {
          try {
            const assetData = await getDeviceAsset(client, Number(device.deviceId));
            
            // Skip if deleted
            if (assetData.device?.deleted === 'true') {
              continue;
            }
            
            // Get organization info for the device
            let clientName = "Unknown";
            if (device.orgUnitId) {
              try {
                const orgResponse = await client.get<NCentralOrgUnitResponse>(`/api/org-units/${device.orgUnitId}`);
                clientName = orgResponse.data.data?.name || "Unknown";
              } catch (err) {
                console.error(`Error fetching org unit for device ${device.id}:`, err);
              }
            }
            
            // Determine manufacturer enum
            let manufacturer = Manufacturer.DELL;
            const mfgName = (assetData.computersystem?.manufacturer || '').toLowerCase();
            
            if (mfgName.includes('dell')) {
              manufacturer = Manufacturer.DELL;
            } else if (mfgName.includes('hp') || mfgName.includes('hewlett')) {
              manufacturer = Manufacturer.HP;
            }
            
            // Map to our normalized Device format
            const mappedDevice: Device = {
              id: assetData.device?.deviceid,
              hostname: assetData.device?.longname || assetData.computersystem?.netbiosname || '',
              manufacturer: manufacturer,
              model: assetData.computersystem?.model || '',
              serialNumber: assetData.computersystem?.serialnumber || '',
              clientId: device.orgUnitId?.toString() || 'unknown',
              clientName: clientName
            };
            
            result.push(mappedDevice);
          } catch (error) {
            console.error(`Error processing device ${device.id}:`, error);
            // Continue with next device even if this one fails
          }
        }
        
        // Check if there are more pages
        if (devices.length < pageSize) {
          hasMorePages = false;
        } else {
          pageNumber++;
        }
      } catch (error) {
        console.error(`Error fetching N-central devices page ${pageNumber}:`, error);
        hasMorePages = false;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching all N-central devices:', error);
    throw error;
  }
} 