import ImportDevices from '@/components/ImportDevices';
import SyncWarranties from '@/components/SyncWarranties';
import UserProfile from '@/components/UserProfile';
import { getAllDevices } from '@/lib/database/service';
import { Device } from '@/types/device';
import { logger } from '@/lib/logger';
import { isSaaSMode } from '@/lib/config';

// Force this page to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Load initial database data on the server
  let initialDevices: Device[] = [];

  try {
    // Get all devices from database (user context handled automatically)
    const dbDevices = await getAllDevices();
    initialDevices = dbDevices;
    
    if (isSaaSMode()) {
      logger.debug('Loaded devices for authenticated user', 'homepage', { count: initialDevices.length });
    }
  } catch (error) {
    logger.error(`Error loading initial database data: ${error}`, 'homepage', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Continue with empty arrays - component will handle gracefully
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="space-y-6">
        <UserProfile />
        <ImportDevices />
        <SyncWarranties devices={initialDevices} />
      </div>
    </div>
  );
} 