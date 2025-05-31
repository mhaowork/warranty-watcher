import { Manufacturer } from '../../types/manufacturer';
import { WarrantyInfo } from '../../types/warranty';
import axios from 'axios';

interface HpWarrantyResponse {
  start_date: string;
  end_date: string;
  status: string;
  serial_number: string;
  product_name: string;
  warranty_type: string;
}

// Mock HP data for demos
async function getMockHpWarrantyInfo(serialNumber: string): Promise<WarrantyInfo> {
  console.log(`Looking up HP warranty for ${serialNumber} (mock implementation)`);

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

  return {
    serialNumber,
    manufacturer: Manufacturer.HP,
    startDate: startDateStr,
    endDate: endDateStr,
    productDescription: 'HP EliteBook 840 G8 (mock data)',
    coverageDetails: [
      'Hardware Support',
      'Accidental Damage Protection',
      'Next Business Day Onsite Service'
    ]
  };
}

async function fetchHpWarrantyData(
  serialNumber: string,
  apiKey: string
): Promise<WarrantyInfo> {
  // Call HP warranty API
  const response = await axios.get<HpWarrantyResponse>(
    `https://api.warrantywatcher.com/warranty/hp/${serialNumber}`,
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
    throw new Error(`Invalid or empty response from HP API for ${serialNumber}`);
  }

  return {
    serialNumber,
    manufacturer: Manufacturer.HP,
    startDate: data.start_date,
    endDate: data.end_date,
    productDescription: data.product_name || 'HP Product',
    coverageDetails: data.warranty_type ? [data.warranty_type] : []
  };
}

export async function getHpWarrantyInfo(
  serialNumber: string,
  apiKey?: string
): Promise<WarrantyInfo> {
  // Check if apiKey is provided
  if (apiKey) {
    const warranty = await fetchHpWarrantyData(serialNumber, apiKey);
    console.log(`Found HP warranty for ${serialNumber}: ${warranty.startDate} to ${warranty.endDate}`);
    return warranty;
  } else {
    console.log('API key is not provided, falling back to mock implementation');
  }

  return getMockHpWarrantyInfo(serialNumber);
} 