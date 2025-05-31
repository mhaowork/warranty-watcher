'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Platform } from '@/types/platform';
import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getPlatformCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import { lookupWarrantiesForDevices } from '@/lib/services/warrantyLookup';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import WarrantyResults from './WarrantyResults';
import { inferWarrantyStatus } from '@/lib/utils/warrantyUtils';

interface SyncWarrantiesProps {
  devices: Device[];
}

export default function SyncWarranties({ devices }: SyncWarrantiesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<WarrantyInfo[]>(
    devices.map(deviceToWarrantyInfo)
  );
  const [skipExistingForLookup, setSkipExistingForLookup] = useState<boolean>(true);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    // Only reset results to device data if we're not in the middle of an operation
    // and don't have fresh lookup results
    if (!isLoading && !currentAction) {
      setResults(devices.map(deviceToWarrantyInfo));
    }
  }, [devices, isLoading, currentAction]);

  async function lookupAllWarranties() {
    if (!devices.length) {
      alert('No devices in the database to process for warranty lookup.');
      return;
    }

    setIsLoading(true);
    setCurrentAction('lookup');
    setProgress(0);
    // Initialize results with all devices being processed
    const initialResults = devices.map(d => deviceToWarrantyInfo(d));
    setResults(initialResults);

    try {
      const result = await lookupWarrantiesForDevices(devices, {
        skipExistingForLookup,
        onProgress: setProgress
      });

      if (!result.success) {
        throw new Error(result.error || 'Warranty lookup failed');
      }

      setResults(result.results);
      // Note: Removed router.refresh() to preserve API results
    } catch (error) {
      console.error('Warranty lookup failed:', error);
      alert('Warranty lookup failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      const errorResults = devices.map(d => ({
        ...deviceToWarrantyInfo(d),
        error: true,
        errorMessage: (error instanceof Error ? error.message : 'Overall lookup processing failed'),
      }));
      setResults(errorResults);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWriteBackWarranties() {
    const itemsToWriteBack = results.filter(
      r => !r.error && !r.skipped && !r.fromCache && !r.writtenBack && r.serialNumber && r.endDate // Ensure warranty was fetched and has an end date
    );

    if (itemsToWriteBack.length === 0) {
      alert('No new warranty information to write back to source platforms.');
      return;
    }

    setIsLoading(true);
    setCurrentAction('writeback');
    setProgress(0);
    const platformCreds = getPlatformCredentials();
    const updatedResults = [...results]; // Create a mutable copy

    for (let i = 0; i < itemsToWriteBack.length; i++) {
      const resultInfo = itemsToWriteBack[i];
      // Find the original device from the `devices` prop to get its ID and accurate sourcePlatform
      const originalDevice = devices.find(d => d.serialNumber === resultInfo.serialNumber);

      if (originalDevice && originalDevice.id && originalDevice.sourcePlatform && originalDevice.sourcePlatform !== Platform.CSV) {
        console.log(`Attempting to write back warranty for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}`);
        try {
          const response = await fetch('/api/platform-data/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: originalDevice.sourcePlatform,
              deviceId: originalDevice.id, // Use original device ID from DB
              warrantyInfo: {
                serialNumber: resultInfo.serialNumber,
                manufacturer: resultInfo.manufacturer,
                startDate: resultInfo.startDate,
                endDate: resultInfo.endDate,
                productDescription: resultInfo.productDescription,
              },
              credentials: platformCreds[originalDevice.sourcePlatform as Platform],
            }),
          });

          const resultIndexInMainArray = updatedResults.findIndex(r => r.serialNumber === resultInfo.serialNumber);

          if (response.ok) {
            console.log(`Successfully wrote back warranty for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}`);
            if (resultIndexInMainArray !== -1) {
              updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: true, error: false, errorMessage: undefined };
            }
          } else {
            const errorData = await response.json();
            const errorMessage = `Write-back failed for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}: ${errorData.error || 'Unknown API error'}`;
            console.error(errorMessage);
            alert(errorMessage); // Consider a less intrusive notification for multiple failures
            if (resultIndexInMainArray !== -1) {
              updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: false, error: true, errorMessage: `Write-back failed: ${errorData.error || 'API error'}` };
            }
          }
        } catch (updateError) {
          const errorMessage = `Exception during write-back for ${resultInfo.serialNumber}: ${(updateError as Error).message}`;
          console.error(errorMessage);
          const resultIndexInMainArray = updatedResults.findIndex(r => r.serialNumber === resultInfo.serialNumber);
          if (resultIndexInMainArray !== -1) {
             updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: false, error: true, errorMessage: `Write-back exception: ${(updateError as Error).message}` };
          }
        }
      } else if (originalDevice && originalDevice.sourcePlatform === Platform.CSV) {
        console.log(`Skipping write-back for ${resultInfo.serialNumber}, source is CSV.`);
      } else if (!originalDevice) {
         console.warn(`Could not find original device for serial ${resultInfo.serialNumber} during write-back.`);
      }

      setProgress(Math.round(((i + 1) / itemsToWriteBack.length) * 100));
      setResults([...updatedResults]); // Update results progressively
    }
    
    setResults([...updatedResults]); // Final update
    setIsLoading(false);
    setCurrentAction(null);
    setProgress(100);
    alert(`Write-back process completed for ${itemsToWriteBack.length} eligible devices. Check results for details.`);
    router.refresh(); // Refresh data from server to get latest db state
  }
  
  function exportToCSV() {
    if (!results.length) {
      alert('No results to export');
      return;
    }
    
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      "Serial Number,Manufacturer,Status,Start Date,End Date,Product Description,Written Back,Skipped,Error,Error Message,Last Updated,Device Source\n" + 
      results.map(item => 
        [
          item.serialNumber,
          item.manufacturer,
          inferWarrantyStatus(item.endDate),
          item.startDate,
          item.endDate,
          item.productDescription || '',
          item.writtenBack ? 'Yes' : 'No',
          item.skipped ? 'Yes' : 'No',
          item.error ? 'Yes' : 'No',
          item.errorMessage || '',
          item.lastUpdated || '',
          item.deviceSource || ''
        ].map(field => String(field || '').replace(/,/g, ' ')).join(",") // Replace commas with spaces to prevent CSV issues
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warranty_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const devicesInPoolCount = devices.length;
  const resultsCount = results.length;
  const canWriteBack = results.some(r => !r.error && !r.skipped && !r.fromCache && !r.writtenBack && r.serialNumber && r.endDate);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Warranty Sync</CardTitle>
        <CardDescription>
          Look up warranty information and write it back to source platforms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">Device Pool Actions</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox 
                    id="skipExistingForLookup" 
                    checked={skipExistingForLookup}
                    onCheckedChange={(checked) => 
                      setSkipExistingForLookup(checked === true)
                    }
                    disabled={isLoading}
                  />
                  <Label htmlFor="skipExistingForLookup">
                    Skip lookup for devices that already have warranty info
                  </Label>
                </div>
                <Button 
                  onClick={lookupAllWarranties} 
                  disabled={isLoading || devicesInPoolCount === 0}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  {isLoading && currentAction === 'lookup' ? 'Looking up Warranties...' : `Lookup All Warranties (${devicesInPoolCount} in pool)`}
                </Button>
              </div>
              
              <div>
                <Button 
                  onClick={handleWriteBackWarranties} 
                  disabled={isLoading || !canWriteBack}
                  size="lg"
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  {isLoading && currentAction === 'writeback' ? 'Writing Back Warranties...' : 'Write Back Warranties to Source(s)'}
                </Button>
                 <p className="mt-1 text-sm text-gray-500">
                  Writes newly fetched warranty data back to the original RMM platform (excluding CSV imports).
                </p>
              </div>
            </div>
          </div>

          {isLoading && currentAction && (
            <div className="w-full space-y-2 mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">
                {currentAction === 'lookup' && `Looked up ${progress}% of devices for warranty`}
                {currentAction === 'writeback' && `Written back ${progress}% of warranties`}
              </p>
            </div>
          )}
        </div>
        
        {resultsCount > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Warranty Results ({resultsCount} devices)</h3>
              <Button onClick={exportToCSV} variant="outline" disabled={isLoading}>Export to CSV</Button>
            </div>
            <WarrantyResults data={results} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 