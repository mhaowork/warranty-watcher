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
            // Improved manufacturer detection with more variants
            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('dell')) {
              device.manufacturer = Manufacturer.DELL;
            } else if (lowerValue.includes('hp') || lowerValue.includes('hewlett') || lowerValue.includes('packard')) {
              device.manufacturer = Manufacturer.HP;
            } else if (lowerValue.includes('lenovo') || lowerValue.includes('thinkpad')) {
              device.manufacturer = Manufacturer.LENOVO;
            } else if (lowerValue.includes('apple') || lowerValue.includes('mac')) {
              device.manufacturer = Manufacturer.APPLE;
            } else if (lowerValue.includes('microsoft') || lowerValue.includes('surface')) {
              device.manufacturer = Manufacturer.MICROSOFT;
            } else if (value) {
              // If there's a value but not recognized, we'll default to DELL
              // This can be changed based on business requirements
              device.manufacturer = Manufacturer.DELL; 
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