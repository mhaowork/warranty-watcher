// This test uses TypeScript directly with tsx
// To run: npx tsx lib/manufacturers/lenovo-test.ts

// Import dotenv to load API credentials from .env file
import 'dotenv/config';

// Import the Lenovo warranty function
import { getLenovoWarrantyInfo } from './lenovo';

// Function to validate credentials
function validateCredentials() {
  const apiKey = process.env.LENOVO_API_KEY;
  
  // Check if credentials are available
  if (!apiKey) {
    console.error('❌ Error: LENOVO_API_KEY environment variable is not set.');
    console.error('Please add this to your .env file and try again.');
    process.exit(1);
  }
  
  console.log('✅ Credentials found in environment variables');
  return { apiKey };
}

// Function to run the test
async function testLenovoApi() {
  console.log('=== Starting Lenovo API Test ===\n');

  // Get and validate credentials
  const { apiKey } = validateCredentials();
  
  console.log('🔍 Testing Lenovo API with provided credentials...');
  
  // Lenovo serial numbers for testing
  const testSerials = [
    '1234ABCD',        // Invalid format
    'PF1WXYZZ',        // Valid format but no warranty data
    'R9NOY12',         // Valid format for testing
    'MP1DU39T',        // Valid format for testing
    'LR0394B2',        // Valid format for testing
    'PF2BXTWK'         // Valid format for testing
  ];

  let apiSuccessCount = 0;
  let mockResponseCount = 0;
  let errorCount = 0;
  
  // Test each serial number
  for (const serial of testSerials) {
    try {
      console.log(`\n📝 Testing serial number: ${serial}`);
      const result = await getLenovoWarrantyInfo(serial, apiKey);
      
      console.log('✅ API call completed');
      console.log('🔎 Result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if we got real data or mock data
      if (result.productDescription === 'Lenovo ThinkPad X1 Carbon (mock data)') {
        console.warn('⚠️  Note: This appears to be mock data. The API might not be working properly.');
        mockResponseCount++;
      } else {
        console.log('✅ Received real data from Lenovo API');
        apiSuccessCount++;
      }
    } catch (error) {
      console.error(`❌ Error testing serial ${serial}:`, error);
      errorCount++;
    }
  }
  
  // Summary
  console.log('\n=== Lenovo API Test Summary ===');
  console.log(`Total serial numbers tested: ${testSerials.length}`);
  console.log(`Successful API responses: ${apiSuccessCount}`);
  console.log(`Mock responses: ${mockResponseCount}`);
  console.log(`Errors: ${errorCount}`);
  
  if (apiSuccessCount === 0) {
    console.log('\n❌ API TEST STATUS: FAILED - No successful API responses');
    console.log('The Lenovo API integration is not working properly with the provided credentials.');
  } else {
    console.log('\n✅ API TEST STATUS: SUCCESS - At least one API call worked');
    console.log(`The Lenovo API integration is working with the provided credentials (${apiSuccessCount}/${testSerials.length} successful).`);
  }
  
  console.log('\n=== Lenovo API Test Completed ===');
}

// Run the test
testLenovoApi().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 