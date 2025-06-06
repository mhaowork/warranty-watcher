import ImportDevices from '@/components/ImportDevices';
import SyncWarranties from '@/components/SyncWarranties';
import { getAllDevices } from '@/lib/database';
import { Device } from '@/types/device';

// Force this page to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
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
      <div className="space-y-6">
        <ImportDevices />
        <SyncWarranties devices={initialDevices} />
      </div>
    </div>
  );
} 