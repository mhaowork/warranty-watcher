import { Device } from '../../types/device';
import { Manufacturer } from '../../types/manufacturer';

// This would be a client-side function to parse CSV file
export function parseCSVData(csvData: string): Device[] {
  // Split the CSV into lines
  const lines = csvData.trim().split('\n');
  
  // Get headers from the first line
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  
  const devices: Device[] = [];
  
  // Process each line (skip the header)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    
    // Skip empty lines
    if (values.length <= 1) continue;
    
    const device: Partial<Device> = {};
    
    // Map CSV columns to device properties
    headers.forEach((header, index) => {
      if (index < values.length) {
        const value = values[index];
        
        switch (header) {
          case 'serial number':
          case 'serialnumber':
          case 'serial':
            device.serialNumber = value;
            break;
          case 'manufacturer':
          case 'vendor':
            device.manufacturer = 
              value.toLowerCase().includes('dell') ? Manufacturer.DELL :
              value.toLowerCase().includes('hp') ? Manufacturer.HP :
              Manufacturer.DELL; // Default to DELL if unknown
            break;
          case 'model':
            device.model = value;
            break;
          case 'hostname':
          case 'computer name':
          case 'device name':
            device.hostname = value;
            break;
          case 'client id':
          case 'clientid':
            device.clientId = value;
            break;
          case 'client name':
          case 'clientname':
          case 'client':
            device.clientName = value;
            break;
        }
      }
    });
    
    // Only add devices with a serial number
    if (device.serialNumber && device.manufacturer) {
      devices.push(device as Device);
    }
  }
  
  return devices;
} 