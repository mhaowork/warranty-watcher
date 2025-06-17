import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';
import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { logger } from '@/lib/logger';

export interface HaloPSACredentials {
  url: string;
  clientId: string;
  clientSecret: string;
}

// HaloPSA API types
interface HaloPSAAsset {
  id: number;
  inventory_number: string;
  key_field: string;
  key_field2: string; // This appears to be the serial number
  key_field3: string;
  client_id: number;
  client_name: string;
  site_id: number;
  site_name: string;
  username: string;
  assettype_id: number;
  assettype_name: string;
  inactive: boolean;
  warranty_start?: string; // e.g. 2025-06-04T12:00:00
  warranty_end?: string; // e.g. 2026-06-04T12:00:00
  [key: string]: unknown;
}

interface HaloPSAResponse {
  record_count: number;
  assets: HaloPSAAsset[];
}

interface HaloPSAAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Mock data for demo mode
const mockAssets: HaloPSAAsset[] = [
  {
    id: 1,
    inventory_number: 'HALO-DEV-001',
    key_field: 'Dell OptiPlex 7070',
    key_field2: 'JH2RRW1', // Serial number
    key_field3: '',
    client_id: 14,
    client_name: 'Mario and Luigi\'s Pizza Place',
    site_id: 22,
    site_name: 'New York',
    username: 'Mario Monroe',
    assettype_id: 121,
    assettype_name: 'Desktop Computer',
    inactive: false,
    warranty_start: '2025-06-04T12:00:00',
    warranty_end: '2026-06-04T12:00:00'
  },
  {
    id: 2,
    inventory_number: 'HALO-DEV-002',
    key_field: 'HP EliteBook 850 G7',
    key_field2: 'CZC8178FY9', // Serial number
    key_field3: '',
    client_id: 18,
    client_name: 'Freston Cakes and Bakes',
    site_id: 26,
    site_name: 'Orlando',
    username: 'Emma Baker',
    assettype_id: 122,
    assettype_name: 'Laptop',
    inactive: false,
    warranty_start: '2024-01-15T12:00:00',
    warranty_end: '2027-01-15T12:00:00'
  },
  {
    id: 3,
    inventory_number: 'HALO-DEV-003',
    key_field: 'Lenovo ThinkStation P500',
    key_field2: 'CCKWN63', // Serial number
    key_field3: '',
    client_id: 14,
    client_name: 'Mario and Luigi\'s Pizza Place',
    site_id: 22,
    site_name: 'New York',
    username: 'Luigi Mario',
    assettype_id: 122,
    assettype_name: 'Laptop',
    inactive: false
  }
];

/**
 * Helper function to determine manufacturer based on asset info
 * Uses the key_field which contains the model information like "Lenovo ThinkStation P500"
 * TODO: Consolidate determineManufacturer with ncentral.ts & datto.ts
 */
function determineManufacturer(keyField: string, assetTypeName?: string, inventoryNumber?: string): Manufacturer {
  const keyFieldNormalized = (keyField || '').toLowerCase();
  const assetTypeNormalized = (assetTypeName || '').toLowerCase();
  const inventoryNormalized = (inventoryNumber || '').toLowerCase();

  // Primary: Check key_field first (most likely to contain manufacturer info)
  if (keyFieldNormalized.includes('dell')) {
    return Manufacturer.DELL;
  } else if (keyFieldNormalized.includes('hp') || 
    keyFieldNormalized.includes('hewlett')) {
    return Manufacturer.HP;
  } else if (keyFieldNormalized.includes('lenovo')) {
    return Manufacturer.LENOVO;
  }

  // Fallback: Try to infer from asset type name or inventory number
  if (assetTypeNormalized.includes('dell') || inventoryNormalized.includes('dell')) {
    return Manufacturer.DELL;
  } else if (assetTypeNormalized.includes('hp') || 
    assetTypeNormalized.includes('hewlett') ||
    inventoryNormalized.includes('hp')) {
    return Manufacturer.HP;
  } else if (assetTypeNormalized.includes('lenovo') || inventoryNormalized.includes('lenovo')) {
    return Manufacturer.LENOVO;
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
  mock.onPost(/.*\/auth\/token/).reply(200, {
    access_token: 'mock-access-token-for-demo',
    token_type: 'Bearer',
    expires_in: 3600
  });
  
  // Mock assets endpoint
  mock.onGet(/.*\/api\/asset/).reply(200, {
    record_count: mockAssets.length,
    assets: mockAssets
  });
  
  // Mock individual asset fetch endpoint
  mockAssets.forEach(asset => {
    mock.onGet(new RegExp(`.*\/api\/asset\/${asset.id}`)).reply(200, asset);
  });
  
  // Mock the warranty update endpoint (POST with asset data as array)
  mock.onPost(/.*\/api\/asset/).reply(200, [
    {
      id: 1,
      message: "Asset updated successfully"
    }
  ]);
}

/**
 * Fetches devices from HaloPSA
 * 
 * This function can operate in two modes:
 * 1. Demo mode - returns mock data (when credentials are incomplete)
 * 2. Real API mode - calls the HaloPSA API (when complete credentials are provided)
 * 
 * Example usage:
 * 
 * // To use real API:
 * const devices = await fetchHaloPSADevices({
 *   url: 'acme-tech.halopsa.com',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 * });
 * 
 * // To use demo mode:
 * const devices = await fetchHaloPSADevices({
 *   url: 'demo.halopsa.com'
 *   // Missing clientId/clientSecret will trigger demo mode
 * });
 */
export async function fetchHaloPSADevices(credentials?: HaloPSACredentials): Promise<Device[]> {
  try {
    const client = await createHaloPSAClient(credentials);
    return await fetchDevicesUsingRealAPI(client);
  } catch (error) {
    // More user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('400')) {
        throw new Error('Authentication failed. Please check your HaloPSA client credentials.');
      } else if (error.message.includes('404')) {
        throw new Error('HaloPSA API endpoint not found. Please check your server URL.');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Could not connect to HaloPSA server. Please check your server URL and network connection.');
      }
    }
    // Re-throw the original error if it doesn't match any known patterns
    throw error;
  }
}

/**
 * Creates an authenticated HaloPSA API client with consolidated configuration
 */
async function createHaloPSAClient(credentials?: HaloPSACredentials): Promise<AxiosInstance> {
  try {
    // Ensure URL has proper protocol
    const baseURL = credentials?.url?.startsWith('http') ? credentials?.url : `https://${credentials?.url}`;
    const clientId = credentials?.clientId || '';
    const clientSecret = credentials?.clientSecret || '';
    const useDemoMode = (credentials === undefined);
    
    logger.info(`Creating HaloPSA client at ${baseURL} ${useDemoMode ? '(Demo Mode)' : ''}`, 'halopsa-api', {
      baseURL,
      mode: useDemoMode ? 'demo' : 'api'
    });
    // Create the API client
    const axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    // If demo mode is needed, set up mocking
    if (useDemoMode) {
      setupMockAdapter(axiosInstance);
    }
    
    logger.info('Authenticating with HaloPSA', 'halopsa-api');
    
    // Prepare the form data for OAuth2 client credentials flow
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'all');

    const authResponse = await axiosInstance.post<HaloPSAAuthResponse>('/auth/token', formData);

    logger.debug('Authentication response received', 'halopsa-api');

    // Extract the access token from the response
    if (!authResponse.data?.access_token) {
      logger.error('Access token not found in response', 'halopsa-api');
      throw new Error('Access token not found in authentication response');
    }

    const accessToken = authResponse.data.access_token;
    logger.info('Successfully obtained access token', 'halopsa-api');

    // Update the headers with the access token for future requests
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    axiosInstance.defaults.headers.common['Content-Type'] = 'application/json';

    return axiosInstance;
  } catch (error) {
    logger.error(`Error authenticating with HaloPSA: ${error}`, 'halopsa-api', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Main function to fetch devices using the real HaloPSA API
 */
async function fetchDevicesUsingRealAPI(client: AxiosInstance): Promise<Device[]> {
  try {
    logger.info('Fetching assets from HaloPSA', 'halopsa-api');
    
    const response = await client.get<HaloPSAResponse>('/api/asset');
    
    logger.debug('API response received', 'halopsa-api');
    
    if (!response.data?.assets || !Array.isArray(response.data.assets)) {
      logger.error('Unexpected response format from HaloPSA', 'halopsa-api');
      throw new Error('Unexpected API response format');
    }
    
    const assets = response.data.assets;
    logger.info(`Found ${assets.length} assets in response`, 'halopsa-api', {
      assetCount: assets.length
    });
    
    const result: Device[] = [];
    
    // Process each asset
    for (const asset of assets) {
      try {
        // Skip inactive assets
        if (asset.inactive) {
          continue;
        }
        
        // Skip assets without serial numbers (key_field2 appears to be the serial number field)
        if (!asset.key_field2 || asset.key_field2.trim() === '') {
          continue;
        }
        
        // Determine manufacturer and model from available data
        const manufacturer = determineManufacturer(asset.key_field, asset.assettype_name, asset.inventory_number);
        const model = asset.key_field;
        const serialNumber = asset.key_field2.trim();
        const warrantyStartDate = asset.warranty_start ? asset.warranty_start.split('T')[0] : undefined;
        const warrantyEndDate = asset.warranty_end ? asset.warranty_end.split('T')[0] : undefined;
        
        // Map to our normalized Device format
        const mappedDevice: Device = {
          id: asset.id.toString(),
          serialNumber: serialNumber,
          manufacturer: manufacturer,
          model: model,
          hostname: asset.inventory_number || '',
          clientId: asset.client_id.toString(),
          clientName: asset.client_name || '',
          deviceClass: asset.assettype_name || '',
          warrantyStartDate: warrantyStartDate,
          warrantyEndDate: warrantyEndDate
        };

        result.push(mappedDevice);
      } catch (error) {
        logger.error(`Error processing asset ${asset.id}: ${error}`, 'halopsa-api', {
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with next asset even if this one fails
      }
    }
    
    logger.info(`Completed fetching assets. Total devices (with serial number) found: ${result.length}`, 'halopsa-api', {
      totalDevices: result.length
    });
    return result;
  } catch (error) {
    logger.error(`Error fetching HaloPSA assets: ${error}`, 'halopsa-api', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Updates a device's warranty expiration date in HaloPSA
 * 
 * This function can operate in two modes:
 * 1. Demo mode - simulates updating warranty info (when credentials are incomplete)
 * 2. Real API mode - calls the HaloPSA API (when complete credentials are provided)
 * 
 * @param deviceId The HaloPSA asset ID to update
 * @param warrantyEndDate The warranty expiration date in ISO format (YYYY-MM-DD)
 * @param credentials Optional HaloPSA credentials
 * @returns True if update was successful, false otherwise
 */
export async function updateHaloPSAWarranty(
  deviceId: string, 
  warrantyEndDate: string, 
  credentials?: HaloPSACredentials
): Promise<boolean> {
  try {
    logger.info(`Updating HaloPSA warranty for device ${deviceId} to ${warrantyEndDate}`, 'halopsa-api', {
      deviceId,
      warrantyEndDate
    });

    // Authenticate and get client for real API
    const client = await createHaloPSAClient(credentials);
    
    // Convert YYYY-MM-DD to HaloPSA format YYYY-MM-DDTHH:mm:ss
    const haloPSADate = `${warrantyEndDate}T12:00:00`;
    
    const updatedAsset = {
      id: deviceId,
      warranty_end: haloPSADate
    };
    
    const response = await client.post('/api/asset', [updatedAsset], {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logger.info('HaloPSA warranty update response received', 'halopsa-api', {
      statusCode: response.status
    });
    
    // Consider any 2xx status code as success
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    logger.error(`Error updating HaloPSA warranty for device ${deviceId}: ${error}`, 'halopsa-api', {
      deviceId,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
} 