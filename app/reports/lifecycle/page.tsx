import { getAllDevices, getUniqueClientNames, getDeviceCountByClient, getDevicesByClientName } from '@/lib/database';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import LifecycleReport from '@/components/LifecycleReport';
import ClientSelector from '@/components/ClientSelector';
import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import Link from 'next/link';

// Force this page to be dynamic
export const dynamic = 'force-dynamic';

interface ReportParams {
  searchParams: Promise<{
    client?: string;
  }>;
}

export default async function LifecycleReportPage({ searchParams }: ReportParams) {
  const { client } = await searchParams;
  
  // Generate dates on server side to avoid hydration mismatch
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const reportTimestamp = new Date().toLocaleString('en-US');
  
  // Load client information and devices from database
  let devices: Device[] = [];
  let warrantyData: WarrantyInfo[] = [];
  let clients: string[] = [];
  let clientCounts: { clientName: string; count: number }[] = [];
  let selectedClientName: string | undefined = undefined;
  
  try {
    // Load all client names and counts for the selector
    [clients, clientCounts] = await Promise.all([
      getUniqueClientNames(),
      getDeviceCountByClient()
    ]);
    
    // Load devices based on client filter
    if (client && client !== 'all') {
      devices = await getDevicesByClientName(client);
      selectedClientName = client;
    } else {
      devices = await getAllDevices();
      selectedClientName = undefined;
    }
    
    // Convert devices to warranty info format
    warrantyData = devices
      .filter(device => device.serialNumber) // Only include devices with serial numbers
      .map(device => deviceToWarrantyInfo(device));
    
  } catch (error) {
    console.error('Error loading devices for lifecycle report:', error);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Client Selector and Summary */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <ClientSelector 
            clients={clients}
            clientCounts={clientCounts}
            currentClient={selectedClientName}
            placeholder="Select a client..."
            showAllOption={true}
          />
        </div>
      </div>

      {/* Report Content */}
      {warrantyData.length > 0 ? (
        <LifecycleReport 
          data={warrantyData}
          clientName={selectedClientName}
          reportDate={reportDate}
          reportTimestamp={reportTimestamp}
        />
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            {selectedClientName 
              ? `No devices found for ${selectedClientName}. Try selecting a different client or sync devices first.`
              : 'No devices found in the database. Sync devices from your platforms first.'
            }
          </p>
          <Link href="/sync">
            <Button>
              Go to Sync
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
} 