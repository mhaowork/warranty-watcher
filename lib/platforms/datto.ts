import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@/lib/logger';

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

    logger.info(`Connecting to Datto RMM at ${url} ${!useRealApi ? '(DEMO MODE)' : ''}`, 'datto-api', {
      url,
      mode: useRealApi ? 'api' : 'demo'
    });

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
    logger.error(`Error fetching devices from Datto RMM: ${error}`, 'datto-api', {
      error: error instanceof Error ? error.message : String(error)
    });
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
            logger.error('Bad request from Datto API', 'datto-api', {
              statusCode: 400,
              responseData: error.response.data
            });
            throw new Error('Invalid request parameters');
          case 401:
            logger.error('Unauthorized access to Datto API', 'datto-api', {
              statusCode: 401,
              responseData: error.response.data
            });
            throw new Error('Authentication failed');
          case 403:
            logger.error('Forbidden access to Datto API', 'datto-api', {
              statusCode: 403,
              responseData: error.response.data
            });
            throw new Error('Insufficient permissions');
          case 404:
            logger.error('Datto API endpoint not found', 'datto-api', {
              statusCode: 404,
              responseData: error.response.data
            });
            throw new Error('Resource not found');
          case 409:
            logger.error('Conflict in Datto API request', 'datto-api', {
              statusCode: 409,
              responseData: error.response.data
            });
            throw new Error('Concurrent modification conflict');
          case 500:
            logger.error('Datto API server error', 'datto-api', {
              statusCode: error.response.status,
              responseData: error.response.data
            });
            throw new Error('Internal server error');
          default:
            logger.error('Datto API error', 'datto-api', {
              statusCode: error.response.status,
              responseData: error.response.data
            });
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
    const allDevices: DattoDevice[] = [];
    let currentPage = 0;
    let hasMorePages = true;
    let totalCount = 0;
    const maxPages = 100; // Safety limit: 100 pages = 25,000 devices max
    const pageSize = 250;

    logger.info('Starting to fetch all devices from Datto RMM...', 'datto-api');

    while (hasMorePages && currentPage < maxPages) {
      logger.debug(`Fetching page ${currentPage} from Datto RMM...`, 'datto-api', {
        page: currentPage
      });

      const response = await client.get<DevicesPage>('/v2/account/devices', {
        params: {
          max: pageSize,
          page: currentPage
        }
      });

      const pageDevices = response.data.devices;
      totalCount = response.data.pageDetails.totalCount;
      
      allDevices.push(...pageDevices);

      logger.debug(`Fetched ${pageDevices.length} devices on page ${currentPage}. Total so far: ${allDevices.length}/${totalCount}`, 'datto-api', {
        page: currentPage,
        pageDeviceCount: pageDevices.length,
        totalFetched: allDevices.length,
        totalCount
      });

      // Check if we have more pages to fetch
      // Stop if: no nextPageUrl, we got 0 devices on this page, or we've reached totalCount
      hasMorePages = response.data.pageDetails.nextPageUrl !== null && 
                     pageDevices.length > 0 && 
                     allDevices.length < totalCount;
      
      if (hasMorePages) {
        currentPage++;
        
        // Add a small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (currentPage >= maxPages) {
      logger.warn(`Hit safety limit of ${maxPages} pages at ${maxPages * pageSize} devices. Fetched ${allDevices.length} devices, but there may be more.`, 'datto-api', {
        totalDevices: allDevices.length,
        totalPages: currentPage,
        totalCount,
        hitSafetyLimit: true
      });
    } else {
      logger.info(`Successfully fetched all ${allDevices.length} devices from Datto RMM`, 'datto-api', {
        totalDevices: allDevices.length,
        totalPages: currentPage + 1
      });
    }

    return allDevices;
  } catch (error) {
    logger.error(`Error fetching Datto RMM devices: ${error}`, 'datto-api', {
      error: error instanceof Error ? error.message : String(error)
    });
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
    logger.error(`Error fetching Datto RMM device audit for device ${deviceUid}: ${error}`, 'datto-api', {
      deviceUid,
      error: error instanceof Error ? error.message : String(error)
    });
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
    
    // Rate limiting configuration - keeps us under 600 requests/60 seconds
    // Reference: https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm
    const auditDelayMs = 150; // ~6.7 requests/second with safety buffer
    let processedCount = 0;

    logger.info(`Processing ${devices.length} devices from Datto RMM...`, 'datto-api', {
      deviceCount: devices.length,
      estimatedTimeMinutes: Math.round((devices.length * auditDelayMs) / 60000 * 10) / 10,
      auditDelayMs
    });

    // Process each device
    for (const device of devices) {
      try {
        // Skip non-device class items (printers, esxihosts, etc)
        if (device.deviceClass !== 'device') {
          logger.debug(`Skipping non-device class item: ${device.hostname} (${device.deviceClass})`, 'datto-api', {
            hostname: device.hostname,
            deviceClass: device.deviceClass
          });
          continue;
        }

        logger.debug(`Processing device: ${device.hostname} (ID: ${device.uid})`, 'datto-api', {
          hostname: device.hostname,
          deviceUid: device.uid
        });
        
        // Log warranty date from device object
        logger.debug(`Warranty date from Datto RMM: ${device.warrantyDate || 'Not set'}`, 'datto-api', {
          hostname: device.hostname,
          warrantyDate: device.warrantyDate
        });
        
        const audit = await getDeviceAudit(client, device.uid);
        
        // Rate limiting: Add delay after each audit call to respect API limits
        processedCount++;
        
        // Log progress every 50 devices
        if (processedCount % 50 === 0) {
          logger.info(`Progress: ${processedCount}/${devices.length} devices processed (${Math.round(processedCount/devices.length*100)}%)`, 'datto-api', {
            processedCount,
            totalDevices: devices.length,
            progressPercentage: Math.round(processedCount/devices.length*100)
          });
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, auditDelayMs));

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
          logger.debug(`Found warranty end date from device data: ${warrantyEndDate}`, 'datto-api', {
            hostname: device.hostname,
            warrantyEndDate
          });
        } else if (audit.warrantyInfo && audit.warrantyInfo.warrantyEndDate) {
          warrantyEndDate = audit.warrantyInfo.warrantyEndDate;
          logger.debug(`Found warranty end date from audit data: ${warrantyEndDate}`, 'datto-api', {
            hostname: device.hostname,
            warrantyEndDate
          });
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
        logger.error(`Error processing device ${device.hostname} (${device.uid}): ${error}`, 'datto-api', {
          hostname: device.hostname,
          deviceUid: device.uid,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with next device even if this one fails
      }
    }

    logger.info(`Completed processing ${result.length} devices from Datto RMM`, 'datto-api', {
      totalProcessed: result.length,
      totalDevices: devices.length,
      skippedNonDevices: devices.length - processedCount,
      processingTimeEstimateMinutes: Math.round((processedCount * auditDelayMs) / 60000 * 10) / 10
    });

    return result;
  } catch (error) {
    logger.error(`Error fetching all Datto RMM devices: ${error}`, 'datto-api', {
      error: error instanceof Error ? error.message : String(error)
    });
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

    logger.info(`Updating warranty for Datto device ${deviceUid} to ${warrantyEndDate} ${!useRealApi ? '(DEMO MODE)' : ''}`, 'datto-api', {
      deviceUid,
      warrantyEndDate,
      mode: useRealApi ? 'api' : 'demo'
    });

    // If using demo mode, simulate update
    if (!useRealApi) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.info(`[DEMO] Successfully updated warranty date for device ${deviceUid} to ${warrantyEndDate}`, 'datto-api', {
        deviceUid,
        warrantyEndDate,
        mode: 'demo'
      });
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
      logger.info(`Successfully updated warranty expiration date for device ${deviceUid} to ${warrantyEndDate}`, 'datto-api', {
        deviceUid,
        warrantyEndDate
      });
      return true;
    } else {
      logger.error(`Failed to update warranty for device ${deviceUid}: Unexpected status code ${response.status}`, 'datto-api', {
        deviceUid,
        statusCode: response.status
      });
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error updating warranty for device ${deviceUid}: ${error.message}`, 'datto-api', {
        deviceUid,
        error: error.message
      });
    } else {
      logger.error(`Unknown error updating warranty for device ${deviceUid}: ${error}`, 'datto-api', {
        deviceUid,
        error: String(error)
      });
    }
    return false;
  }
} 