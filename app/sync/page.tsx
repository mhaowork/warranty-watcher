import SyncDevices from '../../components/SyncDevices';
import { getAllDevices } from '../../lib/database';
import { Device } from '../../types/device';
import { WarrantyInfo } from '../../types/warranty';
import { inferWarrantyStatus } from '../../lib/utils/warrantyUtils';

// Helper function to convert Device to WarrantyInfo for display
function deviceToWarrantyInfo(device: Device): WarrantyInfo {
  return {
    serialNumber: device.serialNumber,
    manufacturer: device.manufacturer,
    startDate: device.warrantyStartDate || '',
    endDate: device.warrantyEndDate || '',
    status: inferWarrantyStatus(device.warrantyEndDate),
    productDescription: device.model || 'Unknown',
    fromCache: !!device.warrantyFetchedAt,
    writtenBack: !!device.warrantyWrittenBackAt,
    lastUpdated: device.warrantyFetchedAt ? new Date(device.warrantyFetchedAt * 1000).toISOString() : undefined,
    deviceSource: device.sourcePlatform || 'Unknown'
  };
}

export default async function SyncPage() {
  // Load initial database data on the server
  let initialDevices: Device[] = [];
  let initialResults: WarrantyInfo[] = [];
  
  try {
    // Get all devices from database
    const dbDevices = await getAllDevices();
    initialDevices = dbDevices;
    
    // Convert devices with warranty info to warranty results for display
    initialResults = dbDevices
      // Show ALL devices (including those without warranty data)
      .map(deviceToWarrantyInfo);
  } catch (error) {
    console.error('Error loading initial database data:', error);
    // Continue with empty arrays - component will handle gracefully
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Sync Warranty Information</h1>
      <SyncDevices 
        initialDevices={initialDevices}
        initialResults={initialResults}
      />
    </div>
  );
} 