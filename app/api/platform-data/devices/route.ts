import { NextResponse } from 'next/server';
import { Platform } from '../../../../types/platform';
import { fetchDattoDevices } from '../../../../lib/platforms/datto';
import { fetchNCentralDevices } from '../../../../lib/platforms/ncentral';
import { fetchHaloPSADevices } from '../../../../lib/platforms/halopsa';
import { storeDevicesInPool } from '../../../../lib/services/warrantySync';
import { logger } from '@/lib/logger';

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
        
      case Platform.HALOPSA:
        devices = await fetchHaloPSADevices(safeCredentials);
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
      const result = await storeDevicesInPool(devices);
      logger.info(`Stored ${result.successCount} of ${devices.length} devices from ${platform} in database`, 'platform-api', {
        platform,
        totalDevices: devices.length,
        successCount: result.successCount,
        errorCount: result.errorCount
      });
    }
    
    return NextResponse.json(devices);
  } catch (error) {
    logger.error(`Error fetching and storing devices: ${error}`, 'platform-api', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
} 