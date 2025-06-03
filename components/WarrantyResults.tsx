'use client';

import { inferWarrantyStatus } from '@/lib/utils/warrantyUtils';
import { formatRelativeTime } from '@/lib/utils/dateUtils';
import { WarrantyInfo } from '../types/warranty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CheckCircle, XCircle, MinusCircle, FileText, Server, AlertTriangle, Building } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface WarrantyResultsProps {
  data: WarrantyInfo[];
  selectedClient?: string;
}

function getSourceIcon(source?: string) {
  if (!source || source === 'Unknown') {
    return <Server className="h-4 w-4 text-gray-500 mr-1" />;
  }
  
  if (source === 'CSV') {
    return <FileText className="h-4 w-4 text-orange-500 mr-1" />;
  }
  
  // For RMM platforms
  return <Server className="h-4 w-4 text-purple-500 mr-1" />;
}

export default function WarrantyResults({ data, selectedClient }: WarrantyResultsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          <Building className="w-16 h-16 mx-auto mb-2 text-gray-300" />
          <p className="text-lg font-medium">No warranty information available</p>
          {selectedClient && (
            <p className="text-sm">No devices found for client &quot;{selectedClient}&quot;</p>
          )}
        </div>
      </div>
    );
  }
  
  // Get unique clients for summary
  const uniqueClients = Array.from(new Set(data.map(item => item.clientName).filter(Boolean)));
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Summary Section */}
        {!selectedClient && uniqueClients.length > 1 && (
          <div className="bg-muted border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Multi-Client Data Summary</h3>
            <p className="text-muted-foreground text-sm">
              Showing data for {uniqueClients.length} clients: {uniqueClients.slice(0, 3).join(', ')}
              {uniqueClients.length > 3 && ` and ${uniqueClients.length - 3} more`}
            </p>
          </div>
        )}

        <Table>
          <TableCaption>
            Warranty information for {data.length} devices
            {selectedClient && ` from ${selectedClient}`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name & Serial</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Error Status</TableHead>
              <TableHead>Write Back</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.hostname || 'Unknown Device'}</span>
                    <span className="text-xs text-gray-500">{item.serialNumber}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-blue-500 mr-1" />
                    {item.clientName || 'Unknown Client'}
                  </div>
                </TableCell>
                <TableCell>{item.manufacturer}</TableCell>
                <TableCell>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      inferWarrantyStatus(item.endDate) === 'active' ? 'bg-green-100 text-green-800' : 
                      inferWarrantyStatus(item.endDate) === 'expired' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {inferWarrantyStatus(item.endDate)}
                  </span>
                </TableCell>
                <TableCell>{item.startDate || 'Unknown'}</TableCell>
                <TableCell>{item.endDate || 'Unknown'}</TableCell>
                <TableCell>{item.productDescription || 'Unknown'}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {getSourceIcon(item.deviceSource)}
                    <span className="text-xs">{item.deviceSource || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-600">
                  {formatRelativeTime(item.lastUpdated)}
                </TableCell>
                <TableCell>
                  {item.error ? (
                    <div className="flex items-center">
                      {item.errorMessage ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center cursor-help">
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-xs text-red-700">Error</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{item.errorMessage}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-xs text-red-700">Error</span>
                        </div>
                      )}
                    </div>
                  ) : !item.error && !item.errorMessage ? (
                    <div className="flex items-center">
                      <MinusCircle className="h-4 w-4 text-gray-500" />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-700">Success</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.skipped ? (
                    <div className="flex items-center">
                      <MinusCircle className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-xs">Skipped</span>
                    </div>
                  ) : item.writtenBack ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs">Success</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-xs">Not Written</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
} 