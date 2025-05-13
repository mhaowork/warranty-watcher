// This test uses TypeScript directly with ts-node

// Import dotenv to load environment variables from .env file
import 'dotenv/config';

// Import the fetchDattoDevices function from datto.ts
import { fetchDattoDevices } from './datto';

async function testDattoIntegration() {
  console.log('Starting Datto integration test...');
  
  try {
    // Use environment variables loaded by dotenv
    const apiUrl = process.env.DATTO_API_URL;
    const apiKey = process.env.DATTO_API_KEY;
    const secretKey = process.env.DATTO_SECRET_KEY;
    
    // Check if environment variables are set
    if (!apiUrl || !apiKey || !secretKey) {
      console.error('ERROR: Missing environment variables. Please set:');
      console.error('  DATTO_API_URL - The Datto RMM API URL');
      console.error('  DATTO_API_KEY - Your Datto API Key');
      console.error('  DATTO_SECRET_KEY - Your Datto Secret Key');
      console.error('\nSee env-setup-instructions.md for more information.');
      process.exit(1);
    }
    
    console.log('Fetching devices via fetchDattoDevices...');
    const devices = await fetchDattoDevices({
      url: apiUrl,
      apiKey: apiKey,
      secretKey: secretKey
    });
    
    console.log(`Successfully fetched ${devices.length} devices from Datto RMM API`);
    
    // Display detailed information about each device
    for (const device of devices) {
      console.log('\nDevice Details:');
      console.log(`  ID: ${device.id}`);
      console.log(`  Serial Number: ${device.serialNumber || 'N/A'}`);
      console.log(`  Manufacturer: ${device.manufacturer}`);
      console.log(`  Model: ${device.model || 'N/A'}`);
      console.log(`  Hostname: ${device.hostname || 'N/A'}`);
      console.log(`  Client: ${device.clientName || 'N/A'}`);
      
      // Check if warranty info is available
      if (device.hasWarrantyInfo) {
        console.log('  Warranty Info:');
        console.log(`    Start Date: ${device.warrantyStartDate || 'N/A'}`);
        console.log(`    End Date: ${device.warrantyEndDate || 'N/A'}`);
      } else {
        console.log('  No warranty info available');
      }
    }
    
  } catch (error) {
    console.error('ERROR: Failed to fetch devices from Datto RMM API:', error);
    process.exit(1); // Exit with error code
  }
}

// Run the test
testDattoIntegration(); 