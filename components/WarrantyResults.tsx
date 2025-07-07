'use client';

import { useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { inferWarrantyStatus } from '@/lib/utils/warrantyUtils';
import { formatRelativeTime } from '@/lib/utils/dateUtils';
import { WarrantyInfo } from '../types/warranty';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, XCircle, MinusCircle, FileText, Server, AlertTriangle, Building, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface WarrantyResultsProps {
  data: WarrantyInfo[];
  selectedClient?: string;
}

function getSourceIcon(source?: string) {
  if (!source || source === 'Unknown') {
    return <Server className="h-4 w-4 text-muted-foreground mr-1" />;
  }
  
  if (source === 'CSV') {
    return <FileText className="h-4 w-4 text-orange-500 mr-1" />;
  }
  
  // For RMM platforms
  return <Server className="h-4 w-4 text-purple-500 mr-1" />;
}

export default function WarrantyResults({ data, selectedClient }: WarrantyResultsProps) {
  const [search, setSearch] = useQueryState('search', { defaultValue: '' });
  const [page, setPage] = useQueryState('page', { defaultValue: 1, parse: Number });
  const [pageSize, setPageSize] = useQueryState('pageSize', { defaultValue: 50, parse: Number });
  console.log(data, typeof data[0].endDate); // @no-commit

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    
    const searchLower = search.toLowerCase().trim();
    return data.filter(item => 
      item.hostname?.toLowerCase().includes(searchLower) ||
      item.serialNumber?.toLowerCase().includes(searchLower) ||
      item.clientName?.toLowerCase().includes(searchLower) ||
      item.manufacturer?.toLowerCase().includes(searchLower) ||
      item.productDescription?.toLowerCase().includes(searchLower)
    );
  }, [data, search]);

  // Calculate pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useMemo(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page, setPage]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-4">
          <Building className="w-16 h-16 mx-auto mb-2 text-muted" />
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

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search devices, serials, clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground">
          {search && (
            <span>
              Found {totalItems} of {data.length} devices • 
            </span>
          )}
          <span>
            Showing {Math.min(startIndex + 1, totalItems)}-{Math.min(endIndex, totalItems)} of {totalItems} devices
            {selectedClient && ` from ${selectedClient}`}
          </span>
        </div>

        <Table>
          <TableCaption>
            Warranty information
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
            {paginatedData.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.hostname || 'Unknown Device'}</span>
                    <span className="text-xs text-muted-foreground">{item.serialNumber}</span>
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
                <TableCell className="text-xs text-muted-foreground">
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
                      <MinusCircle className="h-4 w-4 text-muted-foreground" />
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
                      <MinusCircle className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-xs">Skipped</span>
                    </div>
                  ) : item.writtenBack ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs">Success</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-xs">Not Written</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
                First
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                Last
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 