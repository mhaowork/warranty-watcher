import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { WarrantyInfo } from '../../../../types/warranty';

// Define typed credentials for each platform
type DattoCredentials = {
  url?: string;
  apiKey?: string;
  secretKey?: string;
};

type NCentralCredentials = {
  serverUrl?: string;
  apiToken?: string;
};

interface UpdateRequest {
  platform: Platform;
  deviceId: string;
  warrantyInfo: WarrantyInfo;
  credentials?: DattoCredentials | NCentralCredentials;
}

export async function POST(request: Request) {
  try {
    const { platform, deviceId, warrantyInfo, credentials }: UpdateRequest = await request.json();
    
    // Check if we have credentials for this platform
    if (!credentials) {
      return NextResponse.json(
        { error: `Missing credentials for ${platform}` },
        { status: 400 }
      );
    }
    
    // Validate credentials based on platform
    switch (platform) {
      case Platform.DATTO_RMM: {
        const dattoCreds = credentials as DattoCredentials;
        if (!dattoCreds.url || !dattoCreds.apiKey || !dattoCreds.secretKey) {
          return NextResponse.json(
            { error: 'Missing required Datto RMM credentials (url, apiKey, secretKey)' },
            { status: 400 }
          );
        }
        break;
      }
        
      case Platform.NCENTRAL: {
        const ncentralCreds = credentials as NCentralCredentials;
        if (!ncentralCreds.serverUrl || !ncentralCreds.apiToken) {
          return NextResponse.json(
            { error: 'Missing required N-central credentials (serverUrl, apiToken)' },
            { status: 400 }
          );
        }
        break;
      }
    }
    
    // This would be where we would update the device in the source system
    // For this demo implementation, we'll just simulate a successful update
    console.log(`Updating device ${deviceId} in ${platform} with warranty info:`, warrantyInfo);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: `Successfully updated warranty information for device ${deviceId} in ${platform}`,
      device: {
        id: deviceId,
        platform,
        warrantyInfo
      }
    });
  } catch (error) {
    console.error('Error updating warranty information:', error);
    return NextResponse.json(
      { error: 'Failed to update warranty information in source system' },
      { status: 500 }
    );
  }
} 