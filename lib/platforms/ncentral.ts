import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';

interface NCentralCredentials {
  serverUrl?: string;
  apiToken?: string;
}

// N-central API types
interface DeviceAsset {
  computersystem?: {
    serialnumber?: string;
    model?: string;
    manufacturer?: string;
  };
  device?: {
    deleted?: string;
    deviceid?: string;
  };
  // ... other properties
}

// Interface for Device item in response
interface NCentralDeviceItem {
  deviceId: string;
  // Additional fields we might need
  hostname?: string;
  clientId?: string;
  clientName?: string;
  // Other fields
  [key: string]: unknown;
}

// Mock data for demo mode
const mockDevices = [
  {
    id: 'nc-1',
    serialNumber: 'JH2RRW1',
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
    serialNumber: 'CCKWN63',
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

/**
 * Helper function to determine manufacturer based on system info
 */
function determineManufacturer(mfgName: string): Manufacturer {
  const normalized = mfgName.toLowerCase();

  if (normalized.includes('dell')) {
    return Manufacturer.DELL;
  } else if (normalized.includes('hp') ||
    normalized.includes('hewlett') ||
    normalized.includes('packard')) {
    return Manufacturer.HP;
  }

  // Default to DELL if unknown
  return Manufacturer.DELL;
}

/**
 * Sets up axios mock adapter for demo mode
 */
function setupMockAdapter(axiosInstance: AxiosInstance): void {
  const mock = new MockAdapter(axiosInstance, { onNoMatch: "passthrough" });
  
  // Mock authentication endpoint
  mock.onPost(/.*\/api\/auth\/authenticate/).reply(200, {
    tokens: {
      access: {
        token: 'mock-access-token-for-demo'
      }
    }
  });
  
  // Mock devices endpoint
  mock.onGet(/.*\/api\/devices$/).reply(200, {
    data: mockDevices.map(device => ({
      deviceId: device.id,
      // Add any other fields needed for device list response
    }))
  });
  
  // Mock individual device asset endpoints
  mockDevices.forEach(device => {
    mock.onGet(new RegExp(`.*\/api\/devices\/${device.id}\/assets`)).reply(200, {
      computersystem: {
        serialnumber: device.serialNumber,
        model: device.model,
        manufacturer: device.manufacturer === Manufacturer.DELL ? 'Dell Inc.' : 'HP Inc.'
      },
      device: {
        deleted: 'false',
        deviceid: device.id
      }
    });
  });
}

/**
 * Fetches devices from N-central
 * 
 * This function can operate in two modes:
 * 1. Demo mode - returns mock data (when credentials are incomplete)
 * 2. Real API mode - calls the N-central API (when complete credentials are provided)
 * 
 * Example usage:
 * 
 * // To use real API:
 * const devices = await fetchNCentralDevices({
 *   serverUrl: 'https://your-ncentral-server.com',
 *   apiToken: 'your-real-api-token'
 * });
 * 
 * // To use demo mode but with real server URL (mocked API calls):
 * const devices = await fetchNCentralDevices({
 *   serverUrl: 'https://your-ncentral-server.com'
 *   // Missing apiToken will trigger demo mode with mocked responses
 * });
 */
export async function fetchNCentralDevices(credentials?: NCentralCredentials): Promise<Device[]> {
  try {
    // Use default or provided credentials
    const serverUrl = credentials?.serverUrl || 'https://demo-ncentral-server.com';
    const apiToken = credentials?.apiToken || '';
    
    // Determine if we should use demo mode based on whether credentials are complete
    const useDemoMode = !credentials?.serverUrl || !credentials?.apiToken || apiToken.trim() === '';
    
    console.log(`Connecting to N-central at ${serverUrl} ${useDemoMode ? '(DEMO MODE)' : ''}`);

    // Create the API client
    const axiosInstance = axios.create({
      baseURL: serverUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // If demo mode is needed, set up mocking
    if (useDemoMode) {
      setupMockAdapter(axiosInstance);
    }
    
    const client = await createNCentralClient(axiosInstance, apiToken);
    return await fetchDevicesUsingRealAPI(client);
  } catch (error) {
    // More user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Authentication failed. Please check your N-central API token.');
      } else if (error.message.includes('404')) {
        throw new Error('N-central API endpoint not found. Please check your server URL.');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Could not connect to N-central server. Please check your server URL and network connection.');
      }
    }
    // Re-throw the original error if it doesn't match any known patterns
    throw error;
  }
}

// REAL API IMPLEMENTATION

/**
 * Creates an authenticated N-central API client
 */
async function createNCentralClient(axiosInstance: AxiosInstance, apiToken: string): Promise<AxiosInstance> {
  // First, authenticate to get access token
  try {
    console.log('Authenticating with N-central');
    const authResponse = await axiosInstance.post(`/api/auth/authenticate`, {}, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
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

    // Update the headers with the access token
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    return axiosInstance;
  } catch (error) {
    console.error('Error authenticating with N-central:', error);
    throw error;
  }
}

/**
 * Fetches device asset information
 */
async function getDeviceAsset(client: AxiosInstance, deviceId: string): Promise<DeviceAsset> {
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
    
    // Fetch all devices directly
    let pageNumber = 1;
    const pageSize = 200;
    let hasMorePages = true;
    const maxPages = 100; // Limit to prevent excessive API calls
    
    while (hasMorePages && pageNumber <= maxPages) {
      try {
        console.log(`Fetching devices page ${pageNumber} (${pageSize} items per page)`);
        const response = await client.get('/api/devices', {
          params: {
            pageSize,
            pageNumber
          }
        });
        
        console.log('API response received');
        
        // Based on the example response format, we know devices are in responseData.data
        const responseData = response.data;
        const devices: NCentralDeviceItem[] = responseData.data;
        
        if (!Array.isArray(devices)) {
          console.error('Unexpected response format');
          throw new Error('Unexpected API response format');
        }
        
        console.log(`Found ${devices.length} devices in response`);
        
        if (devices.length === 0) {
          // No more devices to process
          hasMorePages = false;
          continue;
        }
        
        // Process each device
        for (const device of devices) {
          try {
            const assetData = await getDeviceAsset(client, device.deviceId);
            
            // Skip if deleted
            if (assetData.device?.deleted === 'true') {
              continue;
            }
            
            // Use the helper function to determine manufacturer
            const mfgName = (assetData.computersystem?.manufacturer || '');
            const manufacturer = determineManufacturer(mfgName);
            
            // Map to our normalized Device format with just the essential fields for warranty lookup
            const mappedDevice: Device = {
              id: assetData.device?.deviceid || device.deviceId,
              serialNumber: assetData.computersystem?.serialnumber || '',
              manufacturer: manufacturer,
              model: assetData.computersystem?.model || '',
              // Add hostname and client info if available
              hostname: device.hostname as string || '',
              clientId: device.clientId as string || '',
              clientName: device.clientName as string || ''
            };
            
            result.push(mappedDevice);
          } catch (error) {
            // Ignoring specific error details - just log the failure
            console.error(`Error processing device ${device.deviceId}:`, error);
            // Continue with next device even if this one fails
          }
        }
        
        // Check if there are more pages
        if (devices.length < pageSize) {
          hasMorePages = false;
        } else {
          pageNumber++;
        }
        
        // If we've reached the max page limit, log a warning
        if (pageNumber > maxPages && hasMorePages) {
          console.warn(`Reached maximum page limit (${maxPages}). Some devices may not be returned.`);
        }
      } catch (error) {
        console.error(`Error fetching N-central devices page ${pageNumber}:`, error);
        hasMorePages = false;
      }
    }
    
    console.log(`Completed fetching devices. Total devices found: ${result.length}`);
    return result;
  } catch (error) {
    console.error('Error fetching all N-central devices:', error);
    throw error;
  }
}
