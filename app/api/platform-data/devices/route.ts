import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { fetchDattoDevices } from '../../../../lib/platforms/datto';
import { fetchNCentralDevices } from '../../../../lib/platforms/ncentral';

export async function POST(request: Request) {
  try {
    const { platform, credentials } = await request.json();
    
    // Ensure we have at least an empty credentials object
    const safeCredentials = credentials || {};
    
    switch (platform) {
      case Platform.DATTO_RMM:
        // No need to validate credentials anymore - demo mode will be used automatically when incomplete
        const dattoDevices = await fetchDattoDevices(safeCredentials);
        return NextResponse.json(dattoDevices);
        
      case Platform.NCENTRAL:
        // No need to validate credentials anymore - demo mode will be used automatically when incomplete
        const ncentralDevices = await fetchNCentralDevices(safeCredentials);
        return NextResponse.json(ncentralDevices);
        
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
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
} 