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
        id: 'dev-1',
        serialNumber: 'DELL00123456',
        manufacturer: Manufacturer.DELL,
        model: 'Latitude 5420',
        hostname: 'DESKTOP-ABCDE1',
        clientId: 'CLIENT-1',
        clientName: 'Acme Corporation'
      },
      {
        id: 'dev-2',
        serialNumber: 'HP00789012',
        manufacturer: Manufacturer.HP,
        model: 'EliteBook 840 G8',
        hostname: 'DESKTOP-FGHIJ2',
        clientId: 'CLIENT-1',
        clientName: 'Acme Corporation',
        // This device already has warranty info
        hasWarrantyInfo: true,
        warrantyStartDate: '2022-01-15',
        warrantyEndDate: '2025-01-15',
        warrantyStatus: 'active'
      },
      {
        id: 'dev-3',
        serialNumber: 'DELL00345678',
        manufacturer: Manufacturer.DELL,
        model: 'OptiPlex 7080',
        hostname: 'DESKTOP-KLMNO3',
        clientId: 'CLIENT-2',
        clientName: 'TechNova Solutions'
      },
      {
        id: 'dev-4',
        serialNumber: 'HP00901234',
        manufacturer: Manufacturer.HP,
        model: 'ProBook 450 G8',
        hostname: 'DESKTOP-PQRST4',
        clientId: 'CLIENT-2',
        clientName: 'TechNova Solutions',
        // This device already has warranty info (expired)
        hasWarrantyInfo: true,
        warrantyStartDate: '2020-03-10',
        warrantyEndDate: '2023-03-10',
        warrantyStatus: 'expired'
      },
      {
        id: 'dev-5',
        serialNumber: 'DELL00567890',
        manufacturer: Manufacturer.DELL,
        model: 'XPS 13',
        hostname: 'LAPTOP-UVWXY5',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        id: 'dev-6',
        serialNumber: 'HP00123456',
        manufacturer: Manufacturer.HP,
        model: 'EliteBook x360',
        hostname: 'LAPTOP-ZABCD6',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        id: 'dev-7',
        serialNumber: 'DELL00789012',
        manufacturer: Manufacturer.DELL,
        model: 'Precision 5550',
        hostname: 'WORKSTATION-EFGHI7',
        clientId: 'CLIENT-3',
        clientName: 'Global Enterprises'
      },
      {
        id: 'dev-8',
        serialNumber: 'HP00345678',
        manufacturer: Manufacturer.HP,
        model: 'ZBook Studio G7',
        hostname: 'WORKSTATION-JKLMN8',
        clientId: 'CLIENT-4',
        clientName: 'Innovative Tech'
      },
      {
        id: 'dev-9',
        serialNumber: 'DELL00901234',
        manufacturer: Manufacturer.DELL,
        model: 'Latitude 7420',
        hostname: 'LAPTOP-OPQRS9',
        clientId: 'CLIENT-4',
        clientName: 'Innovative Tech'
      },
      {
        id: 'dev-10',
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