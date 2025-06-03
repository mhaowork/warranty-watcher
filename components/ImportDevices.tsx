'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Platform } from '@/types/platform';
import { getPlatformCredentials } from '@/lib/storage';
import { parseCSVData } from '@/lib/platforms/csv';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import PlatformCredentialStatus from './PlatformCredentialStatus';

export default function ImportDevices() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const configuredPlatforms = [Platform.DATTO_RMM, Platform.NCENTRAL, Platform.CSV];
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.DATTO_RMM);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const router = useRouter();
  
  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value as Platform);
  };
  
  async function importDevicesFromPlatform() {
    setIsLoading(true);
    setCurrentAction('import');
    setProgress(0);
    
    try {
      const platformCreds = getPlatformCredentials();
      const response = await fetch('/api/platform-data/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          platform: selectedPlatform,
          credentials: platformCreds[selectedPlatform]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to import devices from ${selectedPlatform}`);
      }
      
      alert(`Successfully initiated import from ${selectedPlatform}. Refreshing device list...`);
      router.refresh();
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import devices: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  }
  
  function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setCurrentAction('csv-import');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv = e.target?.result as string;
      
      try {
        const parsedCsvDevices = parseCSVData(csv);
        
        if (parsedCsvDevices.length === 0) {
          alert('No devices found in CSV file.');
          setIsLoading(false);
          setCurrentAction(null);
          return;
        }
        
        const response = await fetch('/api/platform-data/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devices: parsedCsvDevices })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to store CSV devices in database');
        }
        
        const { message, stored, total } = await response.json();
        alert(`${message} (${stored} of ${total} devices stored). Refreshing device list...`);
        router.refresh();
      } catch (error) {
        console.error('Failed to parse or store CSV:', error);
        alert('Failed to process CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    };
    reader.readAsText(file);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className='text-xl font-bold'>Import Devices</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="platform">
          <TabsList className="mb-4">
            <TabsTrigger value="platform">Import from Platform</TabsTrigger>
            <TabsTrigger value="csv">Import from CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="platform" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="w-full">
                <Label htmlFor="platform-select" className="mb-2 block">Select Platform</Label>
                <Select 
                  value={selectedPlatform} 
                  onValueChange={handlePlatformChange}
                >
                  <SelectTrigger id="platform-select" className="w-full">
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
                
                <PlatformCredentialStatus platform={selectedPlatform} />
              </div>
              
              <Button 
                onClick={importDevicesFromPlatform}
                disabled={isLoading}
              >
                {isLoading && currentAction === 'import' ? 'Importing...' : `Import Devices from ${selectedPlatform}`}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="csv" className="space-y-4">
            <div className="flex flex-col space-y-4 items-start">
              <div className="w-full">
                <Label htmlFor="csv-upload" className="block mb-2 text-sm font-medium">
                  Upload CSV File to Import Devices
                </Label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvImport}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                  disabled={isLoading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  CSV must include headers for Serial Number and Manufacturer. Devices will be added to the central pool.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isLoading && currentAction && (
          <div className="w-full space-y-2 mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              {currentAction === 'import' && `Importing from platform...`}
              {currentAction === 'csv-import' && `Importing from CSV...`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 