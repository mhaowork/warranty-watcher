import { getAllDevices } from '@/lib/database';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import LifecycleReport from '@/components/LifecycleReport';
import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';

// Force this page to be dynamic
export const dynamic = 'force-dynamic';

// TODO: think through how to generate this report per client
interface ReportParams {
  searchParams: {
    client?: string;
    format?: 'html' | 'print';
  };
}

export default async function LifecycleReportPage({ searchParams }: ReportParams) {
  const { client, format = 'html' } = searchParams;
  
  // Generate dates on server side to avoid hydration mismatch
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const reportTimestamp = new Date().toLocaleString('en-US');
  
  // Load devices from database
  let devices: Device[] = [];
  let warrantyData: WarrantyInfo[] = [];
  
  try {
    devices = await getAllDevices();
    
    // Filter by client if specified
    if (client) {
      devices = devices.filter(device => 
        device.clientName?.toLowerCase().includes(client.toLowerCase())
      );
    }
    
    // Convert devices to warranty info format
    warrantyData = devices
      .filter(device => device.serialNumber) // Only include devices with serial numbers
      .map(device => deviceToWarrantyInfo(device));
    
  } catch (error) {
    console.error('Error loading devices for lifecycle report:', error);
  }

  return (
    <div className={format === 'print' ? 'print-layout' : 'container mx-auto py-8 px-4'}>
      <LifecycleReport 
        data={warrantyData}
        clientName={client}
        format={format}
        reportDate={reportDate}
        reportTimestamp={reportTimestamp}
      />
    </div>
  );
} 