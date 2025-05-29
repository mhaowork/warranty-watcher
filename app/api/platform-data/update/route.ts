import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { WarrantyInfo } from '../../../../types/warranty';
import { updateDattoWarranty } from '../../../../lib/platforms/datto';
import { updateNCentralWarranty } from '../../../../lib/platforms/ncentral';
import { markWarrantyAsWrittenBack } from '../../../../lib/services/warrantySync';

// Define typed credentials for each platform
type DattoCredentials = {
  url?: string;
  apiKey?: string;
  secretKey?: string;
};

type NCentralCredentials = {
  serverUrl?: string;
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const { platform, deviceId, warrantyInfo, credentials } = await request.json();
    
    // Validate required parameters
    if (!platform || !deviceId || !warrantyInfo) {
      return NextResponse.json(
        { error: 'Missing required parameters: platform, deviceId, and warrantyInfo are required' },
        { status: 400 }
      );
    }
    
    const warranty = warrantyInfo as WarrantyInfo;
    let updateSuccess = false;
    
    switch (platform) {
      case Platform.DATTO_RMM: {
        console.log(`Updating device ${deviceId} in Datto RMM with warranty info:`, warranty);
        const dattoCreds = credentials as DattoCredentials;
        updateSuccess = await updateDattoWarranty(
          deviceId,
          warranty.endDate,
          dattoCreds
        );
        break;
      }
      
      case Platform.NCENTRAL: {
        console.log(`Updating device ${deviceId} in N-central with warranty info:`, warranty);
        const ncentralCreds = credentials as NCentralCredentials;
        updateSuccess = await updateNCentralWarranty(
          deviceId,
          warranty.endDate,
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
    
    // Mark warranty as written back in database
    await markWarrantyAsWrittenBack(warranty.serialNumber);
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: `Successfully updated warranty information for device ${deviceId} in ${platform}`,
      device: {
        id: deviceId,
        platform,
        warrantyInfo: warranty
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