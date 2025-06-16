// This test uses TypeScript directly with tsx
// To run: npx tsx lib/database/test-database.ts

import { insertOrUpdateDevice, getAllDevices, getDatabase } from './index.js';
import { Manufacturer } from '../../types/manufacturer.js';

async function testDatabase() {
  try {
    console.log('Testing database setup...');
    
    // First, let's try to get the database instance to see if initialization works
    console.log('Initializing database...');
    await getDatabase();
    console.log('Database initialized successfully');
    
    // Test inserting a device
    console.log('Inserting test device...');
    const testDevice = {
      serialNumber: 'TEST12345',
      manufacturer: Manufacturer.DELL,
      model: 'Latitude 5420',
      hostname: 'test-laptop',
      clientName: 'Test Client',
      sourcePlatform: 'test'
    };
    
    await insertOrUpdateDevice(testDevice);
    console.log('Device inserted successfully');
    
    // Test getting all devices
    console.log('Getting all devices...');
    const devices = await getAllDevices();
    console.log('All devices count:', devices.length);
    if (devices.length > 0) {
      console.log('First device:', {
        serialNumber: devices[0].serialNumber,
        manufacturer: devices[0].manufacturer,
        model: devices[0].model,
        warrantyEndDate: devices[0].warrantyEndDate
      });
    }
    
    console.log('✅ Database test passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

testDatabase(); 