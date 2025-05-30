import ImportDevices from '../../components/ImportDevices';
import SyncWarranties from '../../components/SyncWarranties';
import { getAllDevices } from '../../lib/database';
import { Device } from '../../types/device';

export default async function SyncPage() {
  // Load initial database data on the server
  let initialDevices: Device[] = [];
  
  try {
    // Get all devices from database
    const dbDevices = await getAllDevices();
    initialDevices = dbDevices;
  } catch (error) {
    console.error('Error loading initial database data:', error);
    // Continue with empty arrays - component will handle gracefully
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Sync Warranty Information</h1>
      <div className="space-y-6">
        <ImportDevices />
        <SyncWarranties devices={initialDevices} />
      </div>
    </div>
  );
} 