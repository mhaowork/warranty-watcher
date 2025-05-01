import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { fetchDattoDevices } from '../../../../lib/platforms/datto';

export async function POST(request: Request) {
  try {
    const { platform, credentials } = await request.json();
    
    switch (platform) {
      case Platform.DATTO_RMM:
        const devices = await fetchDattoDevices(credentials);
        return NextResponse.json(devices);
        
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