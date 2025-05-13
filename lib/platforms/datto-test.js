// This test uses the compiled JavaScript from the TypeScript file
// Run this after running a build or compiling the TypeScript files

// Import the module
const { fetchDattoDevices } = require('./lib/platforms/datto');

async function testDattoIntegration() {
  try {
    console.log('Starting Datto integration test...');
    
    console.log('Fetching devices using the implemented datto.ts module...');
    const credentials = {
      url: process.env.TEST_DATTO_API_URL,
      apiKey: process.env.TEST_DATTO_API_KEY,
      secretKey: process.env.TEST_DATTO_SECRET_KEY
    };
    // This will use our actual implementation in datto.ts
    const devices = await fetchDattoDevices(credentials);
    
    console.log(`Successfully fetched ${devices.length} devices from Datto RMM`);
    
    if (devices.length > 0) {
      console.log('Devices found:');
      devices.forEach((device, index) => {
        console.log(`\nDevice ${index + 1}:`);
        console.log(`  ID: ${device.id}`);
        console.log(`  Serial Number: ${device.serialNumber}`);
        console.log(`  Manufacturer: ${device.manufacturer}`);
        console.log(`  Has Warranty Info: ${device.hasWarrantyInfo}`);
        if (device.hasWarrantyInfo) {
          console.log(`  Warranty Start Date: ${device.warrantyStartDate}`);
          console.log(`  Warranty End Date: ${device.warrantyEndDate}`);
        }
      });
    } else {
      console.log('No devices found in your Datto RMM account.');
      console.log('This is normal if you haven\'t added any devices yet.');
      console.log('Demo devices should be returned if no real devices exist.');
    }
  } catch (error) {
    console.error('Error testing Datto integration:', error);
  }
}

// Run the test
testDattoIntegration(); 