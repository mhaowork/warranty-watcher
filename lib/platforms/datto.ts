import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';

interface DattoCredentials {
  url?: string;
  apiKey?: string;
  secretKey?: string;
}

export async function fetchDattoDevices(credentials?: DattoCredentials): Promise<Device[]> {
  try {
    // Use default or provided credentials
    const url = credentials?.url || 'https://example.datto.com';
    const apiKey = credentials?.apiKey || 'demo-api-key';
    
    console.log(`Connecting to Datto RMM at ${url} with API key ${apiKey}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This would normally call the Datto RMM API
    // For now, we'll return mock data
    
    // Create an array of mock devices with predefined data
    return [
      {
        serialNumber: 'DELL00123456',
        manufacturer: Manufacturer.DELL,
        model: 'Latitude 5420',
        hostname: 'DESKTOP-ABCDE1',
        clientId: 'CLIENT-1',
        clientName: 'Acme Corporation'
      },
      {
        serialNumber: 'HP00789012',
        manufacturer: Manufacturer.HP,
        model: 'EliteBook 840 G8',
        hostname: 'DESKTOP-FGHIJ2',
        clientId: 'CLIENT-1',
        clientName: 'Acme Corporation'
      },
      {
        serialNumber: 'DELL00345678',
        manufacturer: Manufacturer.DELL,
        model: 'OptiPlex 7080',
        hostname: 'DESKTOP-KLMNO3',
        clientId: 'CLIENT-2',
        clientName: 'TechNova Solutions'
      },
      {
        serialNumber: 'HP00901234',
        manufacturer: Manufacturer.HP,
        model: 'ProBook 450 G8',
        hostname: 'DESKTOP-PQRST4',
        clientId: 'CLIENT-2',
        clientName: 'TechNova Solutions'
      },
      {
        serialNumber: 'DELL00567890',
        manufacturer: Manufacturer.DELL,
        model: 'XPS 13',
        hostname: 'LAPTOP-UVWXY5',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        serialNumber: 'HP00123456',
        manufacturer: Manufacturer.HP,
        model: 'EliteBook x360',
        hostname: 'LAPTOP-ZABCD6',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        serialNumber: 'DELL00789012',
        manufacturer: Manufacturer.DELL,
        model: 'Precision 5550',
        hostname: 'WORKSTATION-EFGHI7',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        serialNumber: 'HP00345678',
        manufacturer: Manufacturer.HP,
        model: 'ZBook Studio G7',
        hostname: 'WORKSTATION-JKLMN8',
        clientId: 'CLIENT-4',
        clientName: 'Innovative Tech'
      },
      {
        serialNumber: 'DELL00901234',
        manufacturer: Manufacturer.DELL,
        model: 'Latitude 7420',
        hostname: 'LAPTOP-OPQRS9',
        clientId: 'CLIENT-4',
        clientName: 'Innovative Tech'
      },
      {
        serialNumber: 'HP00567890',
        manufacturer: Manufacturer.HP,
        model: 'EliteDesk 800 G6',
        hostname: 'DESKTOP-TUVWX10',
        clientId: 'CLIENT-4',
        clientName: 'Innovative Tech'
      }
    ];
  } catch (error) {
    console.error('Error fetching devices from Datto RMM:', error);
    return [];
  }
} 