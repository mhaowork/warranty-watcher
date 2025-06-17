'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Platform } from '@/types/platform';
import { Device } from '@/types/device';
import { WarrantyInfo } from '@/types/warranty';
import { getPlatformCredentials } from '@/lib/storage';
import { deviceToWarrantyInfo } from '@/lib/utils/deviceUtils';
import { lookupWarrantiesForDevices } from '@/lib/services/warrantyLookup';
import { deleteDeviceById } from '@/lib/database';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { logger } from '@/lib/logger';
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

  async function handleCleanPool() {
    const devicesToProcess = selectedClient && selectedClient !== 'all'
      ? filteredDevices
      : devices;

    if (devicesToProcess.length === 0) {
      alert('No devices in the current pool to clean.');
      return;
    }

    const confirmMessage = selectedClient && selectedClient !== 'all'
      ? `Delete ${devicesToProcess.length} ${selectedClient} client devices one by one from the database? This action cannot be undone.`
      : `Delete all ${devicesToProcess.length} devices one by one from the database? This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    setCurrentAction('cleaning');
    setProgress(0);

    let SucceededCount = 0;
    let failedCount = 0;
    const updatedResultsLocal = [...results]; // Work on a copy to update progressively

    for (let i = 0; i < devicesToProcess.length; i++) {
      const device = devicesToProcess[i];
      const progressPercentage = Math.round(((i + 1) / devicesToProcess.length) * 100);
      setProgress(progressPercentage);

      if (!device.id) {
        logger.warn(`Skipping device without ID: ${device.serialNumber}`, 'sync-warranties', {
          serialNumber: device.serialNumber
        });
        // Mark as error in UI if needed, or just skip
        const resultIndex = updatedResultsLocal.findIndex(r => r.serialNumber === device.serialNumber);
        if (resultIndex !== -1) {
          updatedResultsLocal[resultIndex] = {
            ...updatedResultsLocal[resultIndex],
            error: true,
            errorMessage: 'Skipped - Missing ID',
          };
        }
        failedCount++;
        continue;
      }

      try {
        await deleteDeviceById(device.id); // Call action for a single device


        SucceededCount++;
        // Remove from local results if successfully deleted
        const resultIndex = updatedResultsLocal.findIndex(r => r.serialNumber === device.serialNumber);
        if (resultIndex !== -1) {
          updatedResultsLocal.splice(resultIndex, 1);
        }
      } catch (error) {
        failedCount++;
        logger.error(`Error during deletion of device ${device.serialNumber}: ${error}`, 'sync-warranties', {
          serialNumber: device.serialNumber,
          error: error instanceof Error ? error.message : String(error)
        });
        const resultIndex = updatedResultsLocal.findIndex(r => r.serialNumber === device.serialNumber);
        if (resultIndex !== -1) {
          updatedResultsLocal[resultIndex] = {
            ...updatedResultsLocal[resultIndex],
            error: true,
            errorMessage: error instanceof Error ? error.message : 'Exception during deletion',
          };
        }
      }
      setResults([...updatedResultsLocal]); // Update UI progressively after each attempt
    }

    setProgress(100);
    setIsLoading(false);
    setCurrentAction(null);

    let summaryMessage = 'Device cleaning process completed.\n';
    summaryMessage += `Successfully deleted: ${SucceededCount} device(s).\n`;
    summaryMessage += `Failed to delete: ${failedCount} device(s).`;
    alert(summaryMessage);

    if (SucceededCount > 0) {
      router.refresh(); // Refresh data from server if any device was successfully deleted
    }
  }

  async function lookupWarranties() {
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
        onProgress: setProgress,
        onDeviceResult: (deviceResult, deviceIndex) => {
          // Update results in real-time as each device is processed
          setResults(currentResults => {
            const updatedResults = [...currentResults];
            // Find the device in the original devices array and update its result
            const deviceToUpdate = filteredDevices[deviceIndex];
            const resultIndex = updatedResults.findIndex(r => r.serialNumber === deviceToUpdate.serialNumber);
            
            if (resultIndex !== -1) {
              updatedResults[resultIndex] = deviceResult;
            }
            
            return updatedResults;
          });
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Warranty lookup failed');
      }

      // Final update to ensure all results are properly set
      const finalResults = devices.map(device => {
        const newResult = result.results.find(r => r.serialNumber === device.serialNumber);
        return newResult || deviceToWarrantyInfo(device);
      });

      setResults(finalResults);
      // Note: Removed router.refresh() to preserve API results
    } catch (error) {
      logger.error(`Warranty lookup failed: ${error}`, 'sync-warranties', {
        error: error instanceof Error ? error.message : String(error)
      });
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
        logger.info(`Attempting to write back warranty for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}`, 'sync-warranties', {
          serialNumber: resultInfo.serialNumber,
          platform: originalDevice.sourcePlatform
        });
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
            logger.info(`Successfully wrote back warranty for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}`, 'sync-warranties', {
              serialNumber: resultInfo.serialNumber,
              platform: originalDevice.sourcePlatform
            });
            if (resultIndexInMainArray !== -1) {
              updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: true, error: false, errorMessage: undefined };
            }
          } else {
            const errorData = await response.json();
            const errorMessage = `Write-back failed for ${resultInfo.serialNumber} to ${originalDevice.sourcePlatform}: ${errorData.error || 'Unknown API error'}`;
            logger.error(errorMessage, 'sync-warranties', {
              serialNumber: resultInfo.serialNumber,
              platform: originalDevice.sourcePlatform
            });
            alert(errorMessage); // Consider a less intrusive notification for multiple failures
            if (resultIndexInMainArray !== -1) {
              updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: false, error: true, errorMessage: `Write-back failed: ${errorData.error || 'API error'}` };
            }
          }
        } catch (updateError) {
          const errorMessage = `Exception during write-back for ${resultInfo.serialNumber}: ${(updateError as Error).message}`;
          logger.error(errorMessage, 'sync-warranties', {
            serialNumber: resultInfo.serialNumber,
            error: (updateError as Error).message
          });
          const resultIndexInMainArray = updatedResults.findIndex(r => r.serialNumber === resultInfo.serialNumber);
          if (resultIndexInMainArray !== -1) {
            updatedResults[resultIndexInMainArray] = { ...updatedResults[resultIndexInMainArray], writtenBack: false, error: true, errorMessage: `Write-back exception: ${(updateError as Error).message}` };
          }
        }
      } else if (originalDevice && originalDevice.sourcePlatform === Platform.CSV) {
        logger.debug(`Skipping write-back for ${resultInfo.serialNumber}, source is CSV.`, 'sync-warranties', {
          serialNumber: resultInfo.serialNumber,
          source: 'CSV'
        });
      } else if (!originalDevice) {
        logger.warn(`Could not find original device for serial ${resultInfo.serialNumber} during write-back.`, 'sync-warranties', {
          serialNumber: resultInfo.serialNumber
        });
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

  // TODO: add a warning if getManufacturerCredentials is not complete
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
              <div className="flex items-center space-x-2">
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

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={lookupWarranties}
                  disabled={isLoading || devicesInPoolCount === 0}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isLoading && currentAction === 'lookup' ? 'Looking up Warranties...' : `Lookup ${selectedClient && selectedClient !== 'all' ? `${selectedClient} ` : ''}Warranties (${devicesInPoolCount} in scope)`}
                </Button>
                <Button
                  onClick={handleWriteBackWarranties}
                  disabled={isLoading || !canWriteBack}
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {isLoading && currentAction === 'writeback' ? 'Writing Back Warranties...' : 'Write Back Warranties to Source(s)'}
                </Button>
                <Button
                  onClick={handleCleanPool}
                  disabled={isLoading}
                  size="lg"
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  Delete Devices from Pool
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Writes newly fetched warranty data back to the original RMM platform (excluding CSV imports).
              </p>
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
                {currentAction === 'cleaning' && (progress < 100 ? `Deleting devices... ${progress}%` : 'Deletion complete!')}
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
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" disabled={isLoading || resultsCount === 0}>
                  <Link href={`/reports/lifecycle?client=${selectedClient}`} target="_blank" rel="noopener noreferrer">
                    Generate Lifecycle Report
                  </Link>
                </Button>
                <Button onClick={exportToCSV} variant="outline" disabled={isLoading || resultsCount === 0}>
                  Export to CSV
                </Button>
              </div>
            </div>
            <WarrantyResults data={filteredResults} selectedClient={selectedClient} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 