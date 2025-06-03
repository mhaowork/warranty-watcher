'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, Grid3X3 } from 'lucide-react';

interface ClientSelectorProps {
  clients: string[];
  clientCounts?: { clientName: string; count: number }[];
  currentClient?: string;
  placeholder?: string;
  showAllOption?: boolean;
  onClientChange?: (clientName: string) => void;
}

export default function ClientSelector({ 
  clients, 
  clientCounts,
  currentClient,
  placeholder = "Select a client...",
  showAllOption = true,
  onClientChange
}: ClientSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedClient, setSelectedClient] = useState<string>('');

  function handleClientChange(value: string) {
    setSelectedClient(value);
    
    // If onClientChange callback is provided, use it instead of URL navigation
    if (onClientChange) {
      onClientChange(value);
      return;
    }
    
    // Otherwise, use URL search params (for pages like reports)
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === 'all' || value === '') {
      params.delete('client');
    } else {
      params.set('client', value);
    }
    
    // Navigate to updated URL
    router.push(`?${params.toString()}`);
  }

  function getDisplayName(clientName: string): string {
    if (!clientCounts) return clientName;
    
    const clientCount = clientCounts.find(c => c.clientName === clientName);
    return clientCount ? `${clientName} (${clientCount.count} devices)` : clientName;
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <Users className="w-4 h-4 mr-2" />
        No clients found
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center text-sm font-medium text-gray-700">
        <Users className="w-4 h-4 mr-2" />
        Client:
      </div>
      
      <Select value={currentClient ?? selectedClient} onValueChange={handleClientChange}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              <div className="flex items-center">
                <Grid3X3 className="w-4 h-4 mr-2 text-gray-500" />
                All Clients ({clientCounts?.reduce((sum, c) => sum + c.count, 0) || 0} devices)
              </div>
            </SelectItem>
          )}
          {clients.map((client) => (
            <SelectItem key={client} value={client}>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-gray-500" />
                {getDisplayName(client)}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 