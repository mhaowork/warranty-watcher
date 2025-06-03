'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Platform } from '@/types/platform';
import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getPlatformCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import { lookupWarrantiesForDevices } from '@/lib/services/warrantyLookup';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import WarrantyResults from './WarrantyResults';
import ClientSelector from './ClientSelector';
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
  const [selectedClient, setSelectedClient] = useState<string>('');
  const router = useRouter();
  
  // Calculate client data from devices
  const clientData = useMemo(() => {
    const clientNames = Array.from(new Set(
      devices
        .map(device => device.clientName)
        .filter((name): name is string => Boolean(name))
    )).sort();
    
    const clientCounts = clientNames.map(clientName => ({
      clientName,
      count: devices.filter(device => device.clientName === clientName).length
    }));
    
    return { clientNames, clientCounts };
  }, [devices]);
  
  // Filter devices and results based on selected client
  const filteredDevices = useMemo(() => {
    if (!selectedClient || selectedClient === 'all') {
      return devices;
    }
    return devices.filter(device => device.clientName === selectedClient);
  }, [devices, selectedClient]);
  
  const filteredResults = useMemo(() => {
    if (!selectedClient || selectedClient === 'all') {
      return results;
    }
    return results.filter(result => result.clientName === selectedClient);
  }, [results, selectedClient]);
  
  // Handle client selection change
  function handleClientChange(clientName: string) {
    setSelectedClient(clientName === 'all' ? '' : clientName);
  }

  async function lookupAllWarranties() {
    if (!filteredDevices.length) {
      alert('No devices in the selected scope to process for warranty lookup.');
      return;
    }

    setIsLoading(true);
    setCurrentAction('lookup');
    setProgress(0);
    // Initialize results with all devices being processed
    const initialResults = devices.map(d => deviceToWarrantyInfo(d));
    setResults(initialResults);

    try {
      const result = await lookupWarrantiesForDevices(filteredDevices, {
        skipExistingForLookup,
        onProgress: setProgress
      });

      if (!result.success) {
        throw new Error(result.error || 'Warranty lookup failed');
      }

      // Merge the new results with existing results for non-filtered devices
      const updatedResults = devices.map(device => {
        const newResult = result.results.find(r => r.serialNumber === device.serialNumber);
        return newResult || deviceToWarrantyInfo(device);
      });
      
      setResults(updatedResults);
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
    setProgress(100);
    alert(`Write-back process completed for ${itemsToWriteBack.length} eligible devices. Check results for details.`);
    router.refresh(); // Refresh data from server to get latest db state
  }
  
  function exportToCSV() {
    if (!filteredResults.length) {
      alert('No results to export');
      return;
    }
    
    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      "Device Name,Serial Number,Client Name,Manufacturer,Status,Start Date,End Date,Product,Source,Last Updated,Error Status,Write Back\n" + 
      filteredResults.map(item => {
        // Format error status
        let errorStatus = 'Success';
        if (item.error) {
          errorStatus = item.errorMessage ? `Error: ${item.errorMessage}` : 'Error';
        } else if (!item.error && !item.errorMessage) {
          errorStatus = 'None';
        }
        
        // Format write back status
        let writeBackStatus = 'Not Written';
        if (item.skipped) {
          writeBackStatus = 'Skipped';
        } else if (item.writtenBack) {
          writeBackStatus = 'Success';
        }
        
        return [
          item.hostname || 'Unknown Device',
          item.serialNumber,
          item.clientName,
          item.manufacturer,
          inferWarrantyStatus(item.endDate),
          item.startDate,
          item.endDate,
          item.productDescription,
          item.deviceSource,
          item.lastUpdated,
          errorStatus,
          writeBackStatus
        ].map(field => String(field || '').replace(/,/g, ' ')).join(","); // Replace commas with spaces to prevent CSV issues
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = selectedClient && selectedClient !== 'all' 
      ? `warranty_report_${selectedClient}_${new Date().toISOString().split('T')[0]}.csv`
      : `warranty_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const devicesInPoolCount = filteredDevices.length;
  const resultsCount = filteredResults.length;
  const canWriteBack = filteredResults.some(r => !r.error && r.serialNumber && r.endDate);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className='text-xl font-bold'>Device Pool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Client Filter */}
          {clientData.clientNames.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Filter by Client</h3>
              <ClientSelector 
                clients={clientData.clientNames}
                clientCounts={clientData.clientCounts}
                currentClient={selectedClient}
                placeholder="Select a client..."
                showAllOption={true}
                onClientChange={handleClientChange}
              />
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Device Pool Actions</h3>
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
                  {isLoading && currentAction === 'lookup' ? 'Looking up Warranties...' : `Lookup ${selectedClient && selectedClient !== 'all' ? `${selectedClient} ` : ''}Warranties (${devicesInPoolCount} in scope)`}
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
              <h3 className="text-lg font-semibold">
                Warranty Results ({resultsCount} device{resultsCount !== 1 ? 's' : ''}{selectedClient && selectedClient !== 'all' ? ` for ${selectedClient}` : ''})
              </h3>
              <Button onClick={exportToCSV} variant="outline" disabled={isLoading}>Export to CSV</Button>
            </div>
            <WarrantyResults data={filteredResults} selectedClient={selectedClient} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 