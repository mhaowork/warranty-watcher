import { NextResponse } from 'next/server';
import { getAllDevices, getDevicesByPlatform } from '../../../../lib/database';

export async function POST(request: Request) {
  try {
    const { platform } = await request.json();
    
    let devices;
    
    if (platform && platform !== 'CSV') {
      // Get devices for specific platform
      devices = await getDevicesByPlatform(platform);
    } else {
      // Get all devices
      devices = await getAllDevices();
    }
    
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices from database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices from database' },
      { status: 500 }
    );
  }
} 