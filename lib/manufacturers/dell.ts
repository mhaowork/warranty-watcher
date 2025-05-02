import { Manufacturer } from '../../types/manufacturer';
import { WarrantyInfo } from '../../types/warranty';

export async function getDellWarrantyInfo(
  serialNumber: string,
  apiKey: string | undefined
): Promise<WarrantyInfo> {
  try {
    // In a real implementation, this would call the Dell API
    // For now, we'll simulate a response
    
    console.log(`Looking up Dell warranty for ${serialNumber} with API key ${apiKey}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a random end date between 0-24 months from now
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    const randomMonths = Math.floor(Math.random() * 48) - 24; // Random months between -24 and +24
    const endDate = new Date(today.getFullYear(), today.getMonth() + randomMonths, today.getDate());
    
    // Determine status based on end date
    const status = endDate > today ? 'active' : 'expired';
    
    return {
      serialNumber,
      manufacturer: Manufacturer.DELL,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status,
      productDescription: 'Dell Latitude 5420',
      coverageDetails: [
        'Hardware Support',
        'Next Business Day Onsite Service'
      ]
    };
  } catch (error) {
    console.error('Error fetching Dell warranty:', error);
    return {
      serialNumber,
      manufacturer: Manufacturer.DELL,
      startDate: '',
      endDate: '',
      status: 'unknown',
    };
  }
} 