import { Manufacturer } from '../../types/manufacturer';
import { WarrantyInfo } from '../../types/warranty';

export async function getHpWarrantyInfo(
  serialNumber: string,
  apiKey?: string
): Promise<WarrantyInfo> {
  try {
    // In a real implementation, this would call the HP API
    // For now, we'll simulate a response
    
    console.log(`Looking up HP warranty for ${serialNumber}${apiKey ? ` with API key ${apiKey}` : ''}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a random end date between 0-36 months from now
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const randomMonths = Math.floor(Math.random() * 36);
    const endDate = new Date(today.getFullYear(), today.getMonth() + randomMonths, today.getDate());
    
    // Determine status based on end date
    const status = endDate > today ? 'active' : 'expired';
    
    return {
      serialNumber,
      manufacturer: Manufacturer.HP,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status,
      productDescription: 'HP EliteBook 840 G8',
      coverageDetails: [
        'Hardware Support',
        'Accidental Damage Protection',
        'Next Business Day Onsite Service'
      ]
    };
  } catch (error) {
    console.error('Error fetching HP warranty:', error);
    return {
      serialNumber,
      manufacturer: Manufacturer.HP,
      startDate: '',
      endDate: '',
      status: 'unknown',
    };
  }
} 