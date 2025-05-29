'use client';

import { WarrantyInfo } from '../types/warranty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CheckCircle, XCircle, MinusCircle, Database, Globe } from 'lucide-react';

interface WarrantyResultsProps {
  data: WarrantyInfo[];
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Invalid Date';
  }
}

export default function WarrantyResults({ data }: WarrantyResultsProps) {
  if (!data || data.length === 0) {
    return <p>No warranty information available.</p>;
  }
  
  return (
    <Table>
      <TableCaption>Warranty information for {data.length} devices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Serial Number</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead>Write Back</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{item.serialNumber}</TableCell>
            <TableCell>{item.manufacturer}</TableCell>
            <TableCell>
              <span 
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  item.status === 'active' ? 'bg-green-100 text-green-800' : 
                  item.status === 'expired' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {item.status}
              </span>
            </TableCell>
            <TableCell>{item.startDate || 'Unknown'}</TableCell>
            <TableCell>{item.endDate || 'Unknown'}</TableCell>
            <TableCell>{item.productDescription || 'Unknown'}</TableCell>
            <TableCell>
              <div className="flex items-center">
                {item.fromCache ? (
                  <>
                    <Database className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-xs text-blue-600">Database</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">API</span>
                  </>
                )}
              </div>
            </TableCell>
            <TableCell className="text-xs text-gray-600">
              {formatDate(item.lastUpdated)}
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
  );
} 