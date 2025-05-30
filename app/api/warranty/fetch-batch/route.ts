import { NextRequest, NextResponse } from 'next/server';
import { Device } from '../../../../types/device';
import { WarrantyInfo } from '../../../../types/warranty';
import { ManufacturerCredentials } from '../../../../types/credentials';
import { fetchAndStoreDeviceWarranty } from '../../../../lib/services/warrantySync';

interface BatchFetchRequest {
  devices: Device[];
  credentials: ManufacturerCredentials;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchFetchRequest = await request.json();
    const { devices, credentials } = body;

    if (!devices || devices.length === 0) {
      return NextResponse.json({ message: 'No devices provided for warranty lookup.', results: [] });
    }

    // Use the devices and credentials directly from the request
    const devicesToProcess: Device[] = devices;
    const manufacturerCreds: ManufacturerCredentials = credentials;

    console.log(`Received ${devicesToProcess.length} devices for batch warranty lookup.`);

    // Removed logic for fetching devices by serialNumbers or criteria,
    // as the client now sends the exact devices to process.

    if (devicesToProcess.length === 0) {
      // This case should ideally be caught by the check above, but kept for safety.
      return NextResponse.json({ message: 'No devices found to process based on input.', results: [] });
    }

    const results: WarrantyInfo[] = [];

    for (const device of devicesToProcess) {
      try {
        // Ensure device has a serial number before attempting to fetch warranty
        if (!device.serialNumber) {
          console.warn(`Skipping device ID ${device.id || 'N/A'} due to missing serial number.`);
          results.push({
            serialNumber: device.serialNumber || 'N/A',
            manufacturer: device.manufacturer,
            startDate: '',
            endDate: '',
            status: 'unknown',
            error: true,
            errorMessage: 'Missing serial number',
            fromCache: false, // It wasn't looked up
            deviceSource: device.sourcePlatform,
            skipped: true,
          });
          continue;
        }

        const warrantyInfo = await fetchAndStoreDeviceWarranty(device, manufacturerCreds);
        results.push(warrantyInfo);
      } catch (e) {
        console.error(`Critical error processing device ${device.serialNumber} in batch:`, e);
        results.push({
          serialNumber: device.serialNumber,
          manufacturer: device.manufacturer,
          startDate: '',
          endDate: '',
          status: 'unknown',
          error: true,
          errorMessage: e instanceof Error ? e.message : 'Batch processing failed catastrophically for this device',
          fromCache: false,
          deviceSource: device.sourcePlatform
        });
      }
    }

    // The response from this API is directly used by the client to update its 'results' state.
    // So, it should return the array of WarrantyInfo objects.
    // The 'message' and counts can be logged server-side or handled if the client needs them.
    // For now, let's return the raw results as the client expects.
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in batch warranty fetch API:', error);
    // Return a generic error response or a more detailed one if needed
    // The client will update its results to show an error state for all items.
    // It might be better to return an array of error objects, one for each input device,
    // but for a top-level catch, a single error response is typical.
    // The current client component expects an array of WarrantyInfo, even on error.
    // Let's try to match that behavior if possible or send a clear error structure.
    
    // Attempt to get devices from the request again if parsing failed mid-request
    // This is tricky as the error might be in parsing `request.json()` itself.
    // For now, we send a general error.
    // If the body was { devices: [...] }, we might try to construct error results for those.

    return NextResponse.json(
      { error: 'Failed to process batch warranty fetch', details: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
} 