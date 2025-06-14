// This test uses TypeScript directly with ts-node
// To run: NODE_OPTIONS='--experimental-specifier-resolution=node' npx tsx lib/platforms/datto-test.ts

// Import dotenv to load environment variables from .env file
import 'dotenv/config';

// Import the fetchDattoDevices and updateDattoWarranty functions from datto.ts
import { fetchDattoDevices, updateDattoWarranty } from './datto';

// Setup function to get credentials from environment variables
function getCredentials() {
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
  
  return {
    url: apiUrl,
    apiKey: apiKey,
    secretKey: secretKey
  };
}

/**
 * Main test function that runs the complete Datto RMM test flow:
 * 1. Fetch devices and check for warranty info
 * 2. Update warranty on a device
 * 3. Fetch devices again to verify the warranty was updated
 */
async function testDattoRMM() {
  console.log('=== Starting Datto RMM Test ===\n');
  
  try {
    const credentials = getCredentials();
    
    // Step 1: Initial fetch to get devices and check warranty info
    console.log('Step 1: Fetching devices to check initial warranty status...');
    let devices = await fetchDattoDevices(credentials);
    console.log(`Successfully fetched ${devices.length} devices from Datto RMM API`);
    
    // Count devices with warranty information
    const devicesWithWarranty = devices.filter(device => device.warrantyEndDate);
    console.log(`Found ${devicesWithWarranty.length} devices with warranty information`);
    
    // Select a device to update
    // Find a device with a valid ID to update
    const deviceToUpdate = devices.find(device => device.id && typeof device.id === 'string');
    
    if (!deviceToUpdate || !deviceToUpdate.id) {
      console.error('No devices with valid IDs available for warranty update.');
      process.exit(1);
    }
    
    // Display the device details before the update
    console.log('\nSelected device for warranty update:');
    console.log(`  ID: ${deviceToUpdate.id}`);
    console.log(`  Serial Number: ${deviceToUpdate.serialNumber || 'N/A'}`);
    console.log(`  Manufacturer: ${deviceToUpdate.manufacturer}`);
    console.log(`  Model: ${deviceToUpdate.model || 'N/A'}`);
    console.log(`  Hostname: ${deviceToUpdate.hostname || 'N/A'}`);
    
    // Display current warranty info
    if (deviceToUpdate.warrantyEndDate) {
      console.log('  Current Warranty Info:');
      console.log(`    End Date: ${deviceToUpdate.warrantyEndDate}`);
    } else {
      console.log('  No warranty info currently available');
    }
    
    // Step 2: Update the warranty date
    // Set warranty date to one year from today
    const today = new Date();
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    // Format the date as YYYY-MM-DD
    const newWarrantyDate = oneYearFromNow.toISOString().split('T')[0];
    
    console.log('\nStep 2: Updating warranty information...');
    console.log(`Setting warranty end date for device ${deviceToUpdate.id} to: ${newWarrantyDate}`);
    
    const updateResult = await updateDattoWarranty(
      deviceToUpdate.id,
      newWarrantyDate,
      credentials
    );
    
    if (!updateResult) {
      console.error('Warranty update failed. Test cannot continue.');
      process.exit(1);
    }
    
    console.log('Warranty update successful!');
    
    // Step 3: Fetch devices again to verify the warranty date was updated
    console.log('\nStep 3: Fetching devices again to verify warranty update...');
    
    // Wait a moment to allow the API to process the update
    console.log('Waiting 2 seconds for the API to process the update...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    devices = await fetchDattoDevices(credentials);
    
    // Find the updated device
    const updatedDevice = devices.find(device => device.id === deviceToUpdate.id);
    
    if (!updatedDevice) {
      console.error(`Device ${deviceToUpdate.id} not found in the second fetch. Test failed.`);
      process.exit(1);
    }
    
    // Verify the warranty info
    console.log('\nUpdated device information:');
    console.log(`  ID: ${updatedDevice.id}`);
    console.log(`  Serial Number: ${updatedDevice.serialNumber || 'N/A'}`);
    console.log(`  Manufacturer: ${updatedDevice.manufacturer}`);
    console.log(`  Model: ${updatedDevice.model || 'N/A'}`);
    console.log(`  Hostname: ${updatedDevice.hostname || 'N/A'}`);
    
    if (updatedDevice.warrantyEndDate) {
      console.log('  Updated Warranty Info:');
      console.log(`    End Date: ${updatedDevice.warrantyEndDate || 'N/A'}`);
      
      // Check if the warranty date matches what we set
      if (updatedDevice.warrantyEndDate === newWarrantyDate) {
        console.log('\n✅ WARRANTY UPDATE VERIFICATION: SUCCESS');
        console.log(`Warranty date was successfully updated to ${newWarrantyDate}`);
      } else {
        console.log('\n❌ WARRANTY UPDATE VERIFICATION: FAILED');
        console.log(`Expected warranty date ${newWarrantyDate}, but got ${updatedDevice.warrantyEndDate}`);
      }
    } else {
      console.log('\n❌ WARRANTY UPDATE VERIFICATION: FAILED');
      console.log('Device does not have warranty info after update');
    }
    
    console.log('\n=== Datto RMM Test Completed ===');
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1); // Exit with error code
  }
}

// Run the test
testDattoRMM(); 