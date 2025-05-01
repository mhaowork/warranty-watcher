'use client';

import { useState } from 'react';
import { Platform } from '../types/platform';
import { Device } from '../types/device';
import { WarrantyInfo } from '../types/warranty';
import { getPlatformCredentials, getManufacturerCredentials } from '../lib/storage';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import WarrantyResults from './WarrantyResults';
import { parseCSVData } from '../lib/platforms/csv';

export default function SyncDevices() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [results, setResults] = useState<WarrantyInfo[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [csvData, setCsvData] = useState<string | null>(null);
  
  async function startDattoSync() {
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    
    try {
      // 1. Get credentials from local storage
      const platformCreds = getPlatformCredentials();
      const manufacturerCreds = getManufacturerCredentials();
      
      // 2. Fetch devices from platform (Datto)
      const response = await fetch('/api/platform-data/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          platform: Platform.DATTO_RMM,
          credentials: platformCreds[Platform.DATTO_RMM]
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch devices');
      
      const fetchedDevices = await response.json();
      setDevices(fetchedDevices);
      
      // 3. Process devices in batches and lookup warranty info
      const batchSize = 2; // Small batch size for demo purposes
      const warrantyResults: WarrantyInfo[] = [];
      
      for (let i = 0; i < fetchedDevices.length; i += batchSize) {
        const batch = fetchedDevices.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (device: Device) => {
          try {
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
            
            return await response.json();
          } catch (error) {
            console.error('Error during warranty lookup:', error);
            // Return a default "unknown" warranty record
            return {
              serialNumber: device.serialNumber,
              manufacturer: device.manufacturer,
              startDate: '',
              endDate: '',
              status: 'unknown'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        warrantyResults.push(...batchResults);
        
        // Update progress
        setProgress(Math.min(100, Math.round((i + batch.length) / fetchedDevices.length * 100)));
        setResults([...warrantyResults]); // Update results as they come in
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      setProgress(100);
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
    if (!devices.length) {
      alert('Please upload a CSV file first');
      return;
    }
    
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    
    try {
      // Get manufacturer credentials
      const manufacturerCreds = getManufacturerCredentials();
      
      // Process devices in batches
      const batchSize = 2; // Small batch size for demo purposes
      const warrantyResults: WarrantyInfo[] = [];
      
      for (let i = 0; i < devices.length; i += batchSize) {
        const batch = devices.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (device) => {
          try {
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
            
            return await response.json();
          } catch (error) {
            console.error('Error during warranty lookup:', error);
            // Return a default "unknown" warranty record
            return {
              serialNumber: device.serialNumber,
              manufacturer: device.manufacturer,
              startDate: '',
              endDate: '',
              status: 'unknown'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        warrantyResults.push(...batchResults);
        
        // Update progress
        setProgress(Math.min(100, Math.round((i + batch.length) / devices.length * 100)));
        setResults([...warrantyResults]); // Update results as they come in
      }
    } catch (error) {
      console.error('CSV processing failed:', error);
      alert('CSV processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }
  
  function exportToCSV() {
    if (!results.length) {
      alert('No results to export');
      return;
    }
    
    // Create CSV data
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      "Serial Number,Manufacturer,Status,Start Date,End Date,Product Description\n" + 
      results.map(item => 
        `${item.serialNumber},${item.manufacturer},${item.status},${item.startDate},${item.endDate},${item.productDescription || ''}`
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
        <Tabs defaultValue="datto">
          <TabsList className="mb-4">
            <TabsTrigger value="datto">Datto RMM</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="datto" className="space-y-4">
            <div className="flex flex-col space-y-4 items-start">
              <Button 
                onClick={startDattoSync} 
                disabled={isLoading}
              >
                {isLoading ? 'Syncing...' : 'Start Sync from Datto RMM'}
              </Button>
              
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