'use client';

import { useState, useEffect } from 'react';
import { Platform } from '../types/platform';
import { Device } from '../types/device';
import { WarrantyInfo } from '../types/warranty';
import { getPlatformCredentials, getManufacturerCredentials } from '../lib/storage';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import WarrantyResults from './WarrantyResults';
import { parseCSVData } from '../lib/platforms/csv';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { inferWarrantyStatus } from '../lib/utils/warrantyUtils';

interface SyncOptions {
  writeBackToSource: boolean;
  skipExistingWarrantyInfo: boolean;
}

export default function SyncDevices() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [results, setResults] = useState<WarrantyInfo[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [csvData, setCsvData] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.DATTO_RMM);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    writeBackToSource: false,
    skipExistingWarrantyInfo: true
  });
  const [configuredPlatforms, setConfiguredPlatforms] = useState<Platform[]>([]);
  
  // Load configured platforms
  useEffect(() => {
    const configured: Platform[] = [];
    
    // Include all main platforms regardless of credentials
    configured.push(Platform.DATTO_RMM);
    configured.push(Platform.NCENTRAL);
    
    // Always include CSV
    configured.push(Platform.CSV);
    
    setConfiguredPlatforms(configured);
    
    // Set default platform to the first one
    if (configured.length > 0 && configured[0] !== Platform.CSV) {
      setSelectedPlatform(configured[0]);
    }
  }, []);
  
  // Handle sync options changes
  const handleSyncOptionChange = (option: keyof SyncOptions, value: boolean) => {
    setSyncOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Handle platform selection change
  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value as Platform);
    // Reset devices and results when platform changes
    setDevices([]);
    setResults([]);
  };
  
  async function fetchDevicesFromPlatform() {
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    setDevices([]);
    
    try {
      // 1. Get credentials from local storage
      const platformCreds = getPlatformCredentials();
      
      // 2. Fetch devices from selected platform
      const response = await fetch('/api/platform-data/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          platform: selectedPlatform,
          credentials: platformCreds[selectedPlatform]
        })
      });
      
      if (!response.ok) throw new Error(`Failed to fetch devices from ${selectedPlatform}`);
      
      const fetchedDevices = await response.json();
      setDevices(fetchedDevices);
      
      return fetchedDevices;
    } catch (error) {
      console.error('Fetch failed:', error);
      alert('Failed to fetch devices: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }
  
  async function processDevices(devicesToProcess: Device[]) {
    if (!devicesToProcess.length) {
      alert('No devices to process');
      return;
    }
    
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    
    try {
      // Get manufacturer credentials
      const manufacturerCreds = getManufacturerCredentials();
      // Get platform credentials
      const platformCreds = getPlatformCredentials();
      
      // Process devices in batches
      const batchSize = 2; // Small batch size for demo purposes
      const warrantyResults: WarrantyInfo[] = [];
      
      for (let i = 0; i < devicesToProcess.length; i += batchSize) {
        const batch = devicesToProcess.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (device) => {
          try {
            // Skip devices with existing warranty info if that option is selected
            if (syncOptions.skipExistingWarrantyInfo && device.hasWarrantyInfo) {
              console.log(`Skipping ${device.serialNumber} - already has warranty info`);
              return {
                serialNumber: device.serialNumber,
                manufacturer: device.manufacturer,
                startDate: device.warrantyStartDate || '',
                endDate: device.warrantyEndDate || '',
                status: inferWarrantyStatus(device.warrantyEndDate),
                productDescription: device.model,
                skipped: true
              };
            }
            
            const response = await fetch('/api/warranty', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serialNumber: device.serialNumber,
                manufacturer: device.manufacturer,
                credentials: manufacturerCreds[device.manufacturer]
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to lookup warranty for ${device.serialNumber}`);
            }
            
            const warranty = await response.json();
            let writtenBack = false;
            
            // If write back option is selected, update the source
            if (syncOptions.writeBackToSource && device.id) {
              console.log(`Writing back warranty info for ${device.serialNumber} to ${selectedPlatform}`);
              
              try {
                const updateResponse = await fetch('/api/platform-data/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    platform: selectedPlatform,
                    deviceId: device.id,
                    warrantyInfo: warranty,
                    credentials: platformCreds[selectedPlatform]
                  })
                });
                
                if (updateResponse.ok) {
                  writtenBack = true;
                  console.log(`Successfully updated warranty for ${device.serialNumber} in ${selectedPlatform}`);
                } else {
                  console.error(`Failed to update warranty for ${device.serialNumber} in ${selectedPlatform}`);
                }
              } catch (updateError) {
                console.error('Error writing back warranty info:', updateError);
              }
            }
            
            return { ...warranty, writtenBack };
          } catch (error) {
            console.error('Error during warranty lookup:', error);
            // Return a default "unknown" warranty record
            return {
              serialNumber: device.serialNumber,
              manufacturer: device.manufacturer,
              startDate: '',
              endDate: '',
              status: 'unknown',
              error: true
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        warrantyResults.push(...batchResults);
        
        // Update progress
        setProgress(Math.min(100, Math.round((i + batch.length) / devicesToProcess.length * 100)));
        setResults([...warrantyResults]); // Update results as they come in
      }
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }
  
  // Start sync process for platform-based sources
  async function startPlatformSync() {
    const fetchedDevices = await fetchDevicesFromPlatform();
    if (fetchedDevices && fetchedDevices.length > 0) {
      await processDevices(fetchedDevices);
    }
  }
  
  function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      setCsvData(csv);
      
      // Parse CSV data
      try {
        const devices = parseCSVData(csv);
        setDevices(devices);
      } catch (error) {
        console.error('Failed to parse CSV:', error);
        alert('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  }
  
  async function processCsvDevices() {
    await processDevices(devices);
  }
  
  function exportToCSV() {
    if (!results.length) {
      alert('No results to export');
      return;
    }
    
    // Create CSV data
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      "Serial Number,Manufacturer,Status,Start Date,End Date,Product Description,Written Back,Skipped\n" + 
      results.map(item => 
        `${item.serialNumber},${item.manufacturer},${item.status},${item.startDate},${item.endDate},${item.productDescription || ''},${item.writtenBack ? 'Yes' : 'No'},${item.skipped ? 'Yes' : 'No'}`
      ).join("\n");
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warranty_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sync Warranty Information</CardTitle>
        <CardDescription>
          Fetch devices from your configured platforms and update warranty information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Sync Options</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="writeBack" 
                  checked={syncOptions.writeBackToSource}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    handleSyncOptionChange('writeBackToSource', isChecked);
                    // If write back is disabled, automatically set skipExistingWarrantyInfo to false
                    if (!isChecked) {
                      handleSyncOptionChange('skipExistingWarrantyInfo', false);
                    }
                  }}
                />
                <Label htmlFor="writeBack">
                  Write warranty information back to source
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="skipExisting" 
                  checked={syncOptions.skipExistingWarrantyInfo}
                  disabled={!syncOptions.writeBackToSource}
                  onCheckedChange={(checked) => 
                    handleSyncOptionChange('skipExistingWarrantyInfo', checked === true)
                  }
                />
                <Label htmlFor="skipExisting" className={!syncOptions.writeBackToSource ? "text-gray-400" : ""}>
                  Skip devices with existing warranty information
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="platform">
          <TabsList className="mb-4">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="platform" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="w-full">
                <Label htmlFor="platform" className="mb-2 block">Select Platform</Label>
                <Select 
                  value={selectedPlatform} 
                  onValueChange={handlePlatformChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredPlatforms.includes(Platform.DATTO_RMM) && (
                      <SelectItem value={Platform.DATTO_RMM}>Datto RMM</SelectItem>
                    )}
                    {configuredPlatforms.includes(Platform.NCENTRAL) && (
                      <SelectItem value={Platform.NCENTRAL}>N-able N-central</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {/* Check for missing credentials and show demo mode notice */}
                {(() => {
                  const platformCreds = getPlatformCredentials();
                  const hasPlatformCredentials = selectedPlatform === Platform.DATTO_RMM ? 
                    (platformCreds[Platform.DATTO_RMM]?.url && platformCreds[Platform.DATTO_RMM]?.apiKey && platformCreds[Platform.DATTO_RMM]?.secretKey) :
                  selectedPlatform === Platform.NCENTRAL ?
                    (platformCreds[Platform.NCENTRAL]?.serverUrl && platformCreds[Platform.NCENTRAL]?.apiToken) :
                  true;
                  
                  if (!hasPlatformCredentials) {
                    return (
                      <p className="mt-2 text-sm text-amber-600">
                        No credentials configured for {selectedPlatform}. Running in demo mode with sample data.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <Button 
                onClick={startPlatformSync} 
                disabled={isLoading}
              >
                {isLoading ? 'Syncing...' : `Start Sync from ${selectedPlatform}`}
              </Button>
              
              {devices.length > 0 && !isLoading && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="font-medium">Found {devices.length} devices from {selectedPlatform}</p>
                </div>
              )}
              
              {isLoading && (
                <div className="w-full space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">Processed {progress}% of devices</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="csv" className="space-y-4">
            <div className="flex flex-col space-y-4 items-start">
              <div className="w-full">
                <label className="block mb-2 text-sm font-medium">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                />
                <p className="mt-1 text-sm text-gray-500">
                  CSV must include headers for Serial Number and Manufacturer
                </p>
              </div>
              
              {devices.length > 0 && (
                <div className="space-y-2">
                  <p>Found {devices.length} devices in CSV</p>
                  <Button 
                    onClick={processCsvDevices} 
                    disabled={isLoading || !devices.length}
                  >
                    {isLoading ? 'Processing...' : 'Process CSV Devices'}
                  </Button>
                </div>
              )}
              
              {isLoading && (
                <div className="w-full space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">Processed {progress}% of devices</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {results.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Warranty Results ({results.length} devices)</h3>
              <Button onClick={exportToCSV} variant="outline">Export to CSV</Button>
            </div>
            <WarrantyResults data={results} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 