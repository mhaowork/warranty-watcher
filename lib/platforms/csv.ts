import { Platform } from '@/types/platform';
import { Device } from '../../types/device';
import { determineManufacturer } from '@/lib/utils/manufacturerUtils';

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
    
    const device: Partial<Device> = {
      sourcePlatform: Platform.CSV,
    };
    
    // Map CSV columns to device properties
    headers.forEach((header, index) => {
      if (index < values.length) {
        const value = values[index].replace(/^["']|["']$/g, '');
        switch (header.replace(/^["']|["']$/g, '')) {
          case 'serial number':
          case 'serialnumber':
          case 'serial':
          case 'service tag':
          case 'servicetag':
          case 'asset tag':
          case 'assettag':
            device.serialNumber = value;
            break;
          case 'manufacturer':
          case 'vendor':
          case 'make':
            // Use shared manufacturer determination utility
            if (value) {
              device.manufacturer = determineManufacturer(value);
            }
            break;
          case 'model':
          case 'device model':
          case 'model number':
            device.model = value;
            break;
          case 'hostname':
          case 'computer name':
          case 'device name':
          case 'name':
            device.hostname = value;
            break;
          case 'client id':
          case 'clientid':
          case 'customer id':
          case 'customerId':
            device.clientId = value;
            break;
          case 'client name':
          case 'clientname':
          case 'client':
          case 'customer':
          case 'customer name':
          case 'customername':
            device.clientName = value;
            break;
        }
      }
    });
    
    // Only add devices with a serial number and manufacturer
    if (device.serialNumber && device.manufacturer) {
      devices.push(device as Device);
    }
  }
  
  return devices;
} 