import { Manufacturer } from '../../types/manufacturer';
import { WarrantyInfo } from '../../types/warranty';
import { inferWarrantyStatus } from '../utils/warrantyUtils';
import axios from 'axios';

interface LenovoWarrantyResponse {
  start_date: string;
  end_date: string;
  status: string;
  serial_number: string;
  product_name: string;
  warranty_type: string;
}

// Mock Lenovo data for demos
async function getMockLenovoWarrantyInfo(serialNumber: string): Promise<WarrantyInfo> {
  try {
    console.log(`Looking up Lenovo warranty for ${serialNumber} (mock implementation)`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a random end date between 0-36 months from now
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const randomMonths = Math.floor(Math.random() * 36);
    const endDate = new Date(today.getFullYear(), today.getMonth() + randomMonths, today.getDate());
    
    // Get the formatted dates
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Use the utility function to determine status
    const status = inferWarrantyStatus(endDateStr);
    
    return {
      serialNumber,
      manufacturer: Manufacturer.LENOVO,
      startDate: startDateStr,
      endDate: endDateStr,
      status,
      productDescription: 'Lenovo ThinkPad X1 Carbon (mock data)',
      coverageDetails: [
        'Hardware Support',
        'Premier Support',
        'Accidental Damage Protection'
      ]
    };
  } catch (error) {
    console.error('Error fetching Lenovo warranty:', error);
    return {
      serialNumber,
      manufacturer: Manufacturer.LENOVO,
      startDate: '',
      endDate: '',
      status: 'unknown',
    };
  }
}

// Map Lenovo API status to our WarrantyInfo status
function mapLenovoStatus(status: string): 'active' | 'expired' | 'unknown' {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('active') || lowerStatus === 'in warranty') {
    return 'active';
  } else if (lowerStatus.includes('expired') || lowerStatus === 'out of warranty') {
    return 'expired';
  } else {
    return 'unknown';
  }
}

async function fetchLenovoWarrantyData(
  serialNumber: string,
  apiKey: string
): Promise<WarrantyInfo> {
  try {
    // Call Lenovo warranty API
    const response = await axios.get<LenovoWarrantyResponse>(
      `https://api.warrantywatcher.com/warranty/lenovo/${serialNumber}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = response.data;
    
    // Validate response
    if (!data || !data.end_date) {
      throw new Error(`Invalid or empty response from Lenovo API for ${serialNumber}`);
    }
    
    // Map the status from API to our warranty status format
    // If can't map correctly, use our inferWarrantyStatus function
    let status: 'active' | 'expired' | 'unknown';
    if (data.status) {
      status = mapLenovoStatus(data.status);
    } else {
      status = inferWarrantyStatus(data.end_date);
    }
    
    return {
      serialNumber,
      manufacturer: Manufacturer.LENOVO,
      startDate: data.start_date,
      endDate: data.end_date,
      status,
      productDescription: data.product_name || 'Lenovo Product',
      coverageDetails: data.warranty_type ? [data.warranty_type] : []
    };
  } catch (error) {
    console.error('Error fetching Lenovo warranty data:', error);
    throw error;
  }
}

export async function getLenovoWarrantyInfo(
  serialNumber: string,
  apiKey?: string
): Promise<WarrantyInfo> {
  // Check if apiKey is provided
  if (apiKey) {
    try {
      const warranty = await fetchLenovoWarrantyData(serialNumber, apiKey);
      console.log(`Found Lenovo warranty for ${serialNumber}: ${warranty.startDate} to ${warranty.endDate}`);
      return warranty;
    } catch (error) {
      console.error('Error using Lenovo API:', error);
      throw error;
    }
  } else {
    console.log('API key is not provided, falling back to mock implementation');
  }
  
  return getMockLenovoWarrantyInfo(serialNumber);
} 