// This test uses TypeScript directly with tsx
// To run: NODE_OPTIONS='--experimental-specifier-resolution=node' npx tsx lib/manufacturers/test-dell-api.ts

// Import dotenv to load API credentials from .env file
import 'dotenv/config';

// Import the Dell warranty function
import { getDellWarrantyInfo } from './dell';

// Function to validate credentials
function validateCredentials() {
  const clientId = process.env.DELL_API_CLIENT_ID;
  const clientSecret = process.env.DELL_API_CLIENT_SECRET;
  
  // Check if credentials are available
  if (!clientId || !clientSecret) {
    console.error('❌ Error: DELL_API_CLIENT_ID and/or DELL_API_CLIENT_SECRET environment variables are not set.');
    console.error('Please add these to your .env file and try again.');
    process.exit(1);
  }
  
  console.log('✅ Credentials found in environment variables');
  return { clientId, clientSecret };
}

// Function to run the test
async function testDellApi() {
  console.log('=== Starting Dell API Test ===\n');

  // Get and validate credentials
  const { clientId, clientSecret } = validateCredentials();
  
  console.log('🔍 Testing Dell API with provided credentials...');
  
  // Dell serial numbers with confirmed API status
  const testSerials = [
    '1234ABCD',        // Invalid format (confirmed)
    'ABCDEF1',         // Valid format but no warranty data (empty entitlements)
    '5B98KQ2',         // VALID: Dell OptiPlex 3060 (expired 2021-08-18)
    'CCKWN63',         // VALID: Dell Inspiron 3505 (expired 2022-01-11)
    '27TYZH1',         // Invalid or service tag not found in Dell database
    'JH2RRW1'          // VALID: Dell OptiPlex 7010 (expired 2016-02-22)
  ];

  let apiSuccessCount = 0;
  let mockResponseCount = 0;
  let errorCount = 0;
  
  // Test each serial number
  for (const serial of testSerials) {
    try {
      console.log(`\n📝 Testing serial number: ${serial}`);
      const result = await getDellWarrantyInfo(serial, clientId, clientSecret);
      
      console.log('✅ API call completed');
      console.log('🔎 Result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if we got real data or mock data
      if (result.productDescription === 'Dell Latitude 5420') {
        console.warn('⚠️  Note: This appears to be mock data. The API might not be working properly.');
        mockResponseCount++;
      } else {
        console.log('✅ Received real data from Dell API');
        apiSuccessCount++;
      }
    } catch (error) {
      console.error(`❌ Error testing serial ${serial}:`, error);
      errorCount++;
    }
  }
  
  // Summary
  console.log('\n=== Dell API Test Summary ===');
  console.log(`Total serial numbers tested: ${testSerials.length}`);
  console.log(`Successful API responses: ${apiSuccessCount}`);
  console.log(`Mock responses: ${mockResponseCount}`);
  console.log(`Errors: ${errorCount}`);
  
  if (apiSuccessCount === 0) {
    console.log('\n❌ API TEST STATUS: FAILED - No successful API responses');
    console.log('The Dell API integration is not working properly with the provided credentials.');
  } else {
    console.log('\n✅ API TEST STATUS: SUCCESS - At least one API call worked');
    console.log(`The Dell API integration is working with the provided credentials (${apiSuccessCount}/${testSerials.length} successful).`);
  }
  
  console.log('\n=== Dell API Test Completed ===');
}

// Run the test
testDellApi().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 