import { Device } from '../types/device';
import { Manufacturer } from '../types/manufacturer';
import { insertOrUpdateDevice } from '../lib/database/service';

// Configuration
const TOTAL_DEVICES = 5000;
const BATCH_SIZE = 100;

// Test data arrays for realistic device generation
const manufacturers = [
  Manufacturer.DELL,
  Manufacturer.HP,
  Manufacturer.LENOVO,
  Manufacturer.APPLE,
  Manufacturer.MICROSOFT
];

const dellModels = [
  'OptiPlex 7010', 'OptiPlex 5000', 'Latitude 5520', 'Latitude 7420', 
  'Precision 3460', 'Precision 5560', 'Inspiron 3511', 'Vostro 3400',
  'PowerEdge R740', 'PowerEdge T440', 'XPS 13 9310', 'Alienware m15'
];

const hpModels = [
  'EliteBook 840 G8', 'EliteBook 850 G7', 'ProBook 450 G8', 'ProBook 640 G8',
  'EliteDesk 800 G6', 'ProDesk 400 G7', 'ZBook 15 G8', 'ZBook Studio G8',
  'Pavilion 15-eh1xxx', 'ENVY x360', 'ProLiant DL380 Gen10', 'ProLiant ML350'
];

const lenovoModels = [
  'ThinkPad X1 Carbon', 'ThinkPad T14', 'ThinkPad L15', 'ThinkPad P1',
  'ThinkCentre M720q', 'ThinkCentre M70a', 'IdeaPad 3', 'IdeaPad 5',
  'Legion 5 Pro', 'Yoga 9i', 'ThinkSystem SR650', 'ThinkSystem ST250'
];

const appleModels = [
  'MacBook Pro 13-inch', 'MacBook Pro 14-inch', 'MacBook Pro 16-inch',
  'MacBook Air M1', 'MacBook Air M2', 'iMac 24-inch', 'Mac mini M1',
  'Mac Studio', 'Mac Pro', 'iPad Pro 12.9-inch', 'iPad Air', 'iPhone 14 Pro'
];

const microsoftModels = [
  'Surface Pro 8', 'Surface Pro 9', 'Surface Laptop 4', 'Surface Laptop 5',
  'Surface Book 3', 'Surface Studio 2+', 'Surface Go 3', 'Surface Duo 2',
  'Xbox Series X', 'Xbox Series S', 'HoloLens 2'
];

const deviceClasses = [
  'Desktop', 'Laptop', 'Server', 'Tablet', 'Mobile', 'Workstation', 'All-in-One'
];

const platforms = [
  'Datto RMM', 'N-able N-central', 'HaloPSA', 'CSV Import', 'Manual Entry'
];

const clientNames = [
  'Acme Corporation', 'Global Tech Solutions', 'Metro Healthcare', 'City Law Firm',
  'Riverside Manufacturing', 'Summit Financial', 'Valley School District', 'Harbor Logistics',
  'Mountain View Dental', 'Coastal Real Estate', 'Midwest Auto Group', 'Northern Insurance',
  'Southern Retail Chain', 'Eastern Engineering', 'Western Construction', 'Central Bank',
  'Premier Consulting', 'Elite Marketing', 'Advanced Systems', 'Modern Solutions',
  'Dynamic Enterprises', 'Innovation Labs', 'Smart Technologies', 'Future Industries',
  'Digital Transformation Co', 'Cloud First Solutions', 'Secure Networks Inc', 'Data Analytics Pro'
];

// Helper functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSerialNumber(manufacturer: Manufacturer): string {
  const prefix = manufacturer === Manufacturer.DELL ? 'DL' :
                manufacturer === Manufacturer.HP ? 'HP' :
                manufacturer === Manufacturer.LENOVO ? 'LN' :
                manufacturer === Manufacturer.APPLE ? 'AP' :
                'MS';
  
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const numericPart = randomInt(1000, 9999);
  return `${prefix}${randomPart}${numericPart}`;
}

function generateHostname(manufacturer: Manufacturer): string {
  const prefixes = ['WKS', 'LAP', 'SRV', 'DT', 'NB'];
  const prefix = randomChoice(prefixes);
  const suffix = randomInt(100, 999);
  return `${prefix}-${manufacturer.substring(0, 2).toUpperCase()}${suffix}`;
}

function getModelForManufacturer(manufacturer: Manufacturer): string {
  switch (manufacturer) {
    case Manufacturer.DELL:
      return randomChoice(dellModels);
    case Manufacturer.HP:
      return randomChoice(hpModels);
    case Manufacturer.LENOVO:
      return randomChoice(lenovoModels);
    case Manufacturer.APPLE:
      return randomChoice(appleModels);
    case Manufacturer.MICROSOFT:
      return randomChoice(microsoftModels);
    default:
      return 'Unknown Model';
  }
}

function generateWarrantyDates(): { startDate: string; endDate: string } | null {
  // 70% of devices have warranty information
  if (Math.random() > 0.7) return null;
  
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - randomInt(0, 3)); // 0-3 years ago
  startDate.setMonth(randomInt(0, 11));
  startDate.setDate(randomInt(1, 28));
  
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + randomInt(1, 5)); // 1-5 years warranty
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

function generateDevice(index: number): Device {
  const manufacturer = randomChoice(manufacturers);
  const serialNumber = generateSerialNumber(manufacturer);
  const hostname = generateHostname(manufacturer);
  const model = getModelForManufacturer(manufacturer);
  const clientName = randomChoice(clientNames);
  const platform = randomChoice(platforms);
  const warranty = generateWarrantyDates();
  
  const device: Device = {
    id: `test-device-${index}`,
    serialNumber,
    manufacturer,
    model,
    hostname,
    clientId: `client-${randomInt(1000, 9999)}`,
    clientName,
    deviceClass: randomChoice(deviceClasses),
    sourcePlatform: platform,
    sourceDeviceId: `${platform.toLowerCase().replace(/\s+/g, '-')}-${randomInt(10000, 99999)}`,
  };

  // Add warranty information if generated
  if (warranty) {
    device.warrantyStartDate = warranty.startDate;
    device.warrantyEndDate = warranty.endDate;
    device.warrantyFetchedAt = Math.floor(Date.now() / 1000) - randomInt(0, 86400 * 30); // Within last 30 days
    
    // 30% of devices with warranty have been written back
    if (Math.random() < 0.3) {
      device.warrantyWrittenBackAt = device.warrantyFetchedAt + randomInt(3600, 86400); // 1-24 hours after fetch
    }
  }

  return device;
}

async function insertDeviceBatch(devices: Device[]): Promise<void> {
  const promises = devices.map(device => insertOrUpdateDevice(device));
  await Promise.all(promises);
}

async function main() {
  console.log(`🚀 Starting stress test: Generating and inserting ${TOTAL_DEVICES} devices...`);
  console.log(`📊 Batch size: ${BATCH_SIZE} devices per batch`);
  
  const startTime = Date.now();
  let totalInserted = 0;
  
  try {
    for (let i = 0; i < TOTAL_DEVICES; i += BATCH_SIZE) {
      const batchStart = Date.now();
      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_DEVICES - i);
      const batch: Device[] = [];
      
      // Generate batch of devices
      for (let j = 0; j < currentBatchSize; j++) {
        batch.push(generateDevice(i + j + 1));
      }
      
      // Insert batch
      await insertDeviceBatch(batch);
      totalInserted += currentBatchSize;
      
      const batchTime = Date.now() - batchStart;
      const avgTimePerDevice = batchTime / currentBatchSize;
      const progress = (totalInserted / TOTAL_DEVICES) * 100;
      
      console.log(
        `✅ Batch ${Math.ceil(totalInserted / BATCH_SIZE)} complete: ` +
        `${totalInserted}/${TOTAL_DEVICES} devices (${progress.toFixed(1)}%) | ` +
        `${batchTime}ms total, ${avgTimePerDevice.toFixed(1)}ms per device`
      );
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const totalTime = Date.now() - startTime;
    const avgTimePerDevice = totalTime / TOTAL_DEVICES;
    
    console.log('\n🎉 Stress test completed successfully!');
    console.log(`📈 Performance Summary:`);
    console.log(`   • Total devices inserted: ${totalInserted}`);
    console.log(`   • Total time: ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`   • Average time per device: ${avgTimePerDevice.toFixed(2)}ms`);
    console.log(`   • Devices per second: ${(TOTAL_DEVICES / (totalTime / 1000)).toFixed(2)}`);
    console.log(`   • Database file location: ${process.env.DB_PATH || 'data/warranty.db'}`);
    
  } catch (error) {
    console.error('❌ Stress test failed:', error);
    console.log(`📊 Partial results: ${totalInserted} devices inserted before failure`);
    process.exit(1);
  }
}

// Run the stress test
if (require.main === module) {
  main().catch(console.error);
}

// Export for potential use as a module
export { main as runStressTest, generateDevice }; 