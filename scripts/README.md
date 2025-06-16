# Database Stress Test Scripts

This directory contains scripts for stress testing the Warranty Watcher database with realistic device data.

## 🚀 Quick Start

### Option 1: Using npm script (Recommended)
```bash
npm run stress-test
```

### Option 2: Direct execution
```bash
npx tsx scripts/stress-test-devices.ts
```



## 📊 What the Stress Test Does

The stress test script (`stress-test-devices.ts`) will:

1. **Generate 5,000 realistic device records** with:
   - Various manufacturers (Dell, HP, Lenovo, Apple, Microsoft)
   - Realistic model names for each manufacturer
   - Unique serial numbers with manufacturer-specific prefixes
   - Random hostnames, client names, and device classes
   - Mixed warranty information (70% of devices have warranty data)
   - Different source platforms (Datto RMM, N-central, HaloPSA, etc.)

2. **Insert devices in batches** of 100 for optimal performance

3. **Provide real-time progress updates** including:
   - Batch completion status
   - Performance metrics (ms per device)
   - Overall progress percentage

4. **Generate comprehensive performance report** at the end

## 🔧 Configuration

You can modify the following constants in `stress-test-devices.ts`:

```typescript
const TOTAL_DEVICES = 5000;  // Number of devices to generate
const BATCH_SIZE = 100;      // Devices per batch
```

## 📁 Database Location

The test data will be stored in your configured database location:
- Default: `data/warranty.db` (relative to project root)  
- Environment variable: `DB_PATH` (if set)

## 🧹 Cleanup

To remove all test data after stress testing:

```sql
-- Connect to your SQLite database and run:
DELETE FROM devices WHERE id LIKE 'test-device-%';
```

Or you can use a database browser like DB Browser for SQLite to manually delete the test records.

## 📈 Expected Performance

On a modern system, you should expect:
- **~10-50ms per device** insertion time
- **~5-10 seconds** total execution time for 5,000 devices
- **Database growth** of approximately 1-2 MB for 5,000 records

## 🔍 Sample Generated Data

Example of what a generated device record looks like:

```typescript
{
  id: "test-device-1",
  serialNumber: "DLKJ8QW9LM1234",
  manufacturer: "Dell",
  model: "OptiPlex 7010",
  hostname: "WKS-DE123",
  clientId: "client-1234",
  clientName: "Acme Corporation",
  deviceClass: "Desktop",
  sourcePlatform: "Datto RMM",
  sourceDeviceId: "datto-rmm-12345",
  warrantyStartDate: "2022-03-15",
  warrantyEndDate: "2025-03-15",
  warrantyFetchedAt: 1673123456
}
```

## ⚠️ Important Notes

- **Test Environment**: Run this in a test/development environment first
- **Backup**: Consider backing up your database before running
- **Performance**: Performance may vary based on disk speed and system resources
- **Unique Serials**: All generated serial numbers are unique to avoid conflicts 