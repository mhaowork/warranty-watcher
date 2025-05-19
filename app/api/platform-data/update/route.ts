import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { WarrantyInfo } from '../../../../types/warranty';
import { updateDattoWarranty } from '../../../../lib/platforms/datto';
import { updateNCentralWarranty } from '../../../../lib/platforms/ncentral';

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
    
    // Update the device in the source system based on platform
    let updateSuccess = false;
    
    switch (platform) {
      case Platform.DATTO_RMM: {
        console.log(`Updating device ${deviceId} in Datto RMM with warranty info:`, warrantyInfo);
        const dattoCreds = credentials as DattoCredentials;
        updateSuccess = await updateDattoWarranty(
          deviceId,
          warrantyInfo.endDate,
          dattoCreds
        );
        break;
      }
      
      case Platform.NCENTRAL: {
        console.log(`Updating device ${deviceId} in N-central with warranty info:`, warrantyInfo);
        const ncentralCreds = credentials as NCentralCredentials;
        updateSuccess = await updateNCentralWarranty(
          deviceId,
          warrantyInfo.endDate,
          ncentralCreds
        );
        break;
      }
      
      default: {
        return NextResponse.json(
          { error: `Platform ${platform} is not supported for updates` },
          { status: 400 }
        );
      }
    }
    
    if (!updateSuccess) {
      return NextResponse.json(
        { error: `Failed to update warranty information in ${platform}` },
        { status: 500 }
      );
    }
    
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