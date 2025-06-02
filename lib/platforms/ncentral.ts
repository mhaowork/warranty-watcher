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
  data: {
    _extra?: {
      customer?: {
        customerid: string;
        customername: string;
      };
    };
    computersystem?: {
      serialnumber: string;
      netbiosname: string;
      model: string;
      manufacturer: string;
    };
    device?: {
      deleted: string;
      deviceid: string;
      deviceclass: string;
      longname: string;
    };
    _links?: Record<string, unknown>;
  };
}

// Interface for Device item in response
interface NCentralDeviceItem {
  deviceId: string;
  hostname?: string;
  clientId?: string;
  clientName?: string;
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
    clientName: 'Worldwide Enterprises',
    deviceClass: 'Desktop - Windows'
  },
  {
    id: 'nc-2',
    serialNumber: 'CZC8178FY9',
    manufacturer: Manufacturer.HP,
    model: 'EliteBook 850 G7',
    hostname: 'NCENTRAL-DEV2',
    clientId: 'NC-CLIENT-1', 
    clientName: 'Worldwide Enterprises',
    deviceClass: 'Laptop - Windows'
  },
  {
    id: 'nc-3',
    serialNumber: 'CCKWN63',
    manufacturer: Manufacturer.DELL,
    model: 'Latitude 7400',
    hostname: 'NCENTRAL-DEV3',
    clientId: 'NC-CLIENT-2',
    clientName: 'Acme IT Solutions',
    deviceClass: 'Laptop - Windows'
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
      hostname: device.hostname,
      clientId: device.clientId,
      clientName: device.clientName
    }))
  });
  
  // Mock individual device asset endpoints
  mockDevices.forEach(device => {
    mock.onGet(new RegExp(`.*\/api\/devices\/${device.id}\/assets`)).reply(200, {
      data: {
        _extra: {
          customer: {
            customerid: device.clientId,
            customername: device.clientName
          }
        },
        computersystem: {
          serialnumber: device.serialNumber,
          netbiosname: device.hostname,
          model: device.model,
          manufacturer: device.manufacturer === Manufacturer.DELL ? 'Dell Inc.' : 'HP Inc.'
        },
        device: {
          deleted: "false",
          deviceid: device.id,
          deviceclass: device.deviceClass
        },
        _links: {}
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
    console.log('Device asset response received: ', response.data);
    return response.data; // Return full response which contains data property
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
            if (assetData.data.device?.deleted === 'true') {
              continue;
            }
            
            // Use the helper function to determine manufacturer
            const mfgName = (assetData.data.computersystem?.manufacturer || '');
            const manufacturer = determineManufacturer(mfgName);
            
            // Map to our normalized Device format with just the essential fields for warranty lookup
            const mappedDevice: Device = {
              id: assetData.data.device?.deviceid || device.deviceId,
              serialNumber: assetData.data.computersystem?.serialnumber || '',
              manufacturer: manufacturer,
              model: assetData.data.computersystem?.model || '',
              hostname: assetData.data.device?.longname || assetData.data.computersystem?.netbiosname || '',
              clientId: assetData.data._extra?.customer?.customerid || '',
              clientName: assetData.data._extra?.customer?.customername || '',
              deviceClass: assetData.data.device?.deviceclass || ''
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

/**
 * Updates a device's warranty expiration date in N-central
 * 
 * This function can operate in two modes:
 * 1. Demo mode - simulates updating warranty info (when credentials are incomplete)
 * 2. Real API mode - calls the N-central API (when complete credentials are provided)
 * 
 * @param deviceId The N-central device ID to update
 * @param warrantyEndDate The warranty expiration date in ISO format (YYYY-MM-DD)
 * @param credentials Optional N-central credentials
 * @returns True if update was successful, false otherwise
 */
export async function updateNCentralWarranty(
  deviceId: string, 
  warrantyEndDate: string, 
  credentials?: NCentralCredentials
): Promise<boolean> {
  try {
    // Use default or provided credentials
    const serverUrl = credentials?.serverUrl || 'https://demo-ncentral-server.com';
    const apiToken = credentials?.apiToken || '';
    
    // Determine if we should use demo mode based on whether credentials are complete
    const useDemoMode = !credentials?.serverUrl || !credentials?.apiToken || apiToken.trim() === '';
    
    console.log(`Updating N-central warranty for device ${deviceId} to ${warrantyEndDate} ${useDemoMode ? '(DEMO MODE)' : ''}`);

    // Create the API client
    const axiosInstance = axios.create({
      baseURL: serverUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    });
    
    // If demo mode is needed, set up mocking
    if (useDemoMode) {
      setupWarrantyUpdateMock(axiosInstance);
      // In demo mode, just log and return success
      console.log(`DEMO: Would update device ${deviceId} warranty to expire on ${warrantyEndDate}`);
      return true;
    }
    
    // Authenticate and get client for real API
    const client = await createNCentralClient(axiosInstance, apiToken);
    
    // Call the N-central API to update the warranty date - using PATCH method and correct endpoint
    const response = await client.patch(`/api/devices/${deviceId}/assets/lifecycle-info`, {
      warrantyExpiryDate: warrantyEndDate
    });
    
    console.log(`N-central warranty update response:`, response.status);
    
    // Consider any 2xx status code as success
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`Error updating N-central warranty for device ${deviceId}:`, error);
    return false;
  }
}

/**
 * Sets up axios mock adapter for warranty update in demo mode
 */
function setupWarrantyUpdateMock(axiosInstance: AxiosInstance): void {
  const mock = new MockAdapter(axiosInstance, { onNoMatch: "passthrough" });
  
  // Mock authentication endpoint (same as in the fetch function)
  mock.onPost(/.*\/api\/auth\/authenticate/).reply(200, {
    tokens: {
      access: {
        token: 'mock-access-token-for-demo'
      }
    }
  });
  
  // Mock the warranty update endpoint for any device ID - using correct PATCH endpoint
  mock.onPatch(/.*\/api\/devices\/.*\/assets\/lifecycle-info/).reply(200, {
    success: true,
    message: "Warranty expiry date updated successfully"
  });
}

/**
 * Sample response from N-central Device fetch API
  
  curl --request GET \
       --url https://ncod170.n-able.com/api/devices/1331507060/assets \


  {
  "data": {
    "_extra": {
      "videocontroller": {
        "list": [
          {
            "_index": 0,
            "name": "AMD Radeon (TM) Graphics",
            "videocontrollerid": "VideoController1",
            "description": "AMD Radeon (TM) Graphics",
            "adapterram": "536870912"
          }
        ]
      },
      "socustomer": {
        "customerid": "436",
        "customername": "xxxx"
      },
      "os": {
        "licensetype": null,
        "installdate": null,
        "serialnumber": "00342-22497-80415-AAOEM", // DO NOT USE THIS FIELD FOR WARRANTY LOOKUP
        "publisher": "",
        "csdversion": null,
        "lastbootuptime": null,
        "supportedos": "Microsoft Windows 11 Home",
        "licensekey": null
      },
      "mediaaccessdevice": {
        "list": [
          {
            "_index": 0,
            "mediatype": "Fixed hard disk media",
            "uniqueid": "\\\\.\\PHYSICALDRIVE0"
          }
        ]
      },
      "computersystem": {
        "populatedmemory_slots": "2",
        "totalmemory_slots": "2",
        "systemtype": "x64-based PC",
        "uuid": null
      },
      "logicaldevice": {
        "list": [
          {
            "maxcapacity": "489088348160",
            "_index": 0,
            "volumename": "C:"
          }
        ]
      },
      "physicaldrive": {
        "list": [
          {
            "_index": 0,
            "serialnumber": null,
            "modelnumber": null,
            "capacity": "512105932800"
          }
        ]
      },
      "device": {
        "takecontroluuid": "248c7-52209d5145d6-eu1-30b57020-3501-11f0-b7f9-xxxxxxxx",
        "lastloggedinuser_stillloggedin": "true",
        "lastloggedinuser_sessiontype": "",
        "customerid": "437",
        "warrantyexpirydate": "",
        "lastloggedinuser_domain": "xxxxxxxx",
        "createdon": "2025-05-19 15:27:29.412 -0700",
        "lastloggedinuser": "mainr",
        "ncentralassettag": "xxxxx-e7c7-xxxx-b249-xxxxx-20250519-xxxxxxx"
      },
      "processor": {
        "maxclockspeed": "2000",
        "cpuid": "CPU0",
        "vendor": null,
        "description": "AMD64 Family 25 Model 80 Stepping 0",
        "architecture": null
      },
      "customer": {
        "customerid": "437",
        "customername": "TestCustomer"
      }
    },
    "os": {
      "reportedos": "Microsoft Windows 11 Home",
      "osarchitecture": "64-bit",
      "version": "10.0.26100"
    },
    "computersystem": {
      "serialnumber": "1WPRQ14",
      "netbiosname": "xxxxxxxxx",
      "model": "Inspiron 15 3535",
      "totalphysicalmemory": "17179869184",
      "manufacturer": "Dell Inc."
    },
    "device": {
      "longname": "xxxxxxxxx",
      "deleted": "false",
      "lastlogin": "2025-05-19 15:29:40.586 -0700",
      "deviceclass": "Laptop - Windows",
      "deviceid": "1331507060",
      "uri": "xxxxxxxxx"
    },
    "processor": {
      "name": "AMD Ryzen 7 7730U with Radeon Graphics",
      "numberofcores": "0",
      "numberofcpus": "1"
    }
  },
  "_links": {}
}
*/
  