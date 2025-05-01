'use client';

import { WarrantyInfo } from '../types/warranty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface WarrantyResultsProps {
  data: WarrantyInfo[];
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 