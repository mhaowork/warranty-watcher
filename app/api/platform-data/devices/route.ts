import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { fetchDattoDevices } from '../../../../lib/platforms/datto';
import { fetchNCentralDevices } from '../../../../lib/platforms/ncentral';
import { storeDevicesInPool } from '../../../../lib/services/warrantySync';

export async function POST(request: Request) {
  try {
    const { platform, credentials } = await request.json();
    
    // Ensure we have at least an empty credentials object
    const safeCredentials = credentials || {};
    
    let devices;
    
    switch (platform) {
      case Platform.DATTO_RMM:
        devices = await fetchDattoDevices(safeCredentials);
        break;
        
      case Platform.NCENTRAL:
        devices = await fetchNCentralDevices(safeCredentials);
        break;
        
      case Platform.CSV:
        // CSV upload would be handled differently through a form upload
        return NextResponse.json(
          { error: 'CSV upload should be handled via file upload' },
          { status: 400 }
        );
        
      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        );
    }
    
    // Store devices in database for caching and tracking
    if (devices && devices.length > 0) {
      const result = await storeDevicesInPool(devices, platform);
      console.log(`Stored ${result.successCount} of ${devices.length} devices from ${platform} in database`);
    }
    
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching and storing devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
} 