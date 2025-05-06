import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { fetchDattoDevices } from '../../../../lib/platforms/datto';
import { fetchNCentralDevices } from '../../../../lib/platforms/ncentral';

export async function POST(request: Request) {
  try {
    const { platform, credentials } = await request.json();
    
    // Validate that we have all required credentials for the platform
    if (!credentials) {
      return NextResponse.json(
        { error: 'Missing credentials for platform' },
        { status: 400 }
      );
    }
    
    switch (platform) {
      case Platform.DATTO_RMM:
        // Validate all required Datto RMM credentials are present
        if (!credentials.url || !credentials.apiKey || !credentials.secretKey) {
          return NextResponse.json(
            { error: 'Missing required Datto RMM credentials (url, apiKey, secretKey)' },
            { status: 400 }
          );
        }
        
        const dattoDevices = await fetchDattoDevices(credentials);
        return NextResponse.json(dattoDevices);
        
      case Platform.NCENTRAL:
        // Validate all required N-central credentials are present
        if (!credentials.serverUrl || !credentials.apiToken) {
          return NextResponse.json(
            { error: 'Missing required N-central credentials (serverUrl, apiToken)' },
            { status: 400 }
          );
        }
        
        const ncentralDevices = await fetchNCentralDevices(credentials);
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