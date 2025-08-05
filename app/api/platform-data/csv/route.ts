import { NextRequest, NextResponse } from 'next/server';
import { Device } from '../../../../types/device';
import { storeDevicesInPool } from '../../../../lib/services/warrantySync';
import { logger } from '@/lib/logger';

// TODO: merge this with the platform-data/devices/route.ts file
export async function POST(req: NextRequest) {
  try {
    const { devices }: { devices: Device[] } = await req.json();

    if (!devices || !Array.isArray(devices)) {
      return NextResponse.json(
        { error: 'Invalid devices data provided' },
        { status: 400 }
      );
    }

    if (devices.length === 0) {
      return NextResponse.json(
        { error: 'No devices to store' },
        { status: 400 }
      );
    }

    // Store devices in database using unified ingestion
    const result = await storeDevicesInPool(devices);
    logger.info(`Stored ${result.successCount} of ${devices.length} devices from CSV in database`, 'csv-api', {
      totalDevices: devices.length,
      successCount: result.successCount,
      errorCount: result.errorCount
    });

    return NextResponse.json({ 
      success: true, 
      total: devices.length,
      stored: result.successCount,
      errors: result.errorCount,
      message: result.errorCount > 0 
        ? `Successfully stored ${result.successCount} of ${devices.length} devices from CSV. ${result.errorCount} devices failed validation.`
        : `Successfully stored ${result.successCount} devices from CSV`
    });
  } catch (error) {
    logger.error(`Error storing CSV devices: ${error}`, 'csv-api', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to store CSV devices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 