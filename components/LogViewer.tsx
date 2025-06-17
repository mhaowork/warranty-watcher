'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Trash2, Download } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface LogMessage {
  type: 'connected' | 'log';
  message?: string;
  timestamp: number;
  id?: string;
  level?: LogEntry['level'];
  source?: string;
  metadata?: Record<string, unknown>;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Connect to log stream
  const connectToLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/logs/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (isPaused) return;

      try {
        const data: LogMessage = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Connected to log stream');
        } else if (data.type === 'log' && data.id) {
          const newLog: LogEntry = {
            id: data.id,
            timestamp: data.timestamp,
            level: data.level!,
            message: data.message!,
            source: data.source,
            metadata: data.metadata
          };

          setLogs(prevLogs => {
            // Avoid duplicates
            if (prevLogs.some(log => log.id === newLog.id)) {
              return prevLogs;
            }
            
            // Keep only last 500 logs for performance
            const updatedLogs = [...prevLogs, newLog];
            return updatedLogs.slice(-500);
          });

          // Auto-scroll to bottom if enabled
          if (autoScroll && scrollAreaRef.current) {
            setTimeout(() => {
              const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
              }
            }, 10);
          }
        }
      } catch (error) {
        console.error('Error parsing log message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setTimeout(() => {
        if (!isPaused) {
          connectToLogs();
        }
      }, 3000); // Reconnect after 3 seconds
    };
  };

  // Disconnect from log stream
  const disconnectFromLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  // Toggle pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      connectToLogs();
    } else {
      disconnectFromLogs();
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Export logs
  const exportLogs = () => {
    const filteredLogs = getFilteredLogs();
    const logText = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const source = log.source ? `[${log.source}]` : '';
      const metadata = log.metadata ? ` ${JSON.stringify(log.metadata)}` : '';
      return `${timestamp} ${log.level.toUpperCase()} ${source} ${log.message}${metadata}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warranty-watcher-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get filtered logs
  const getFilteredLogs = () => {
    return filter === 'all' ? logs : logs.filter(log => log.level === filter);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warn': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'debug': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Connect on mount
  useEffect(() => {
    connectToLogs();
    return () => {
      disconnectFromLogs();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = getFilteredLogs();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Real-time Logs
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {logs.length > 0 && (
              <Badge variant="outline">
                {filteredLogs.length} logs
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePause}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
            <TabsTrigger value="error">Errors ({logs.filter(l => l.level === 'error').length})</TabsTrigger>
            <TabsTrigger value="warn">Warnings ({logs.filter(l => l.level === 'warn').length})</TabsTrigger>
            <TabsTrigger value="info">Info ({logs.filter(l => l.level === 'info').length})</TabsTrigger>
            <TabsTrigger value="debug">Debug ({logs.filter(l => l.level === 'debug').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  Auto-scroll
                </label>
              </div>
            </div>
            
            <ScrollArea ref={scrollAreaRef} className="h-96 w-full border rounded">
              <div className="p-4 space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    No logs to display
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 text-sm font-mono border-b border-border pb-2"
                    >
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <Badge className={`${getLevelColor(log.level)} text-white text-xs`}>
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.source && (
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                      )}
                      <span className="flex-1 break-words">
                        {log.message}
                      </span>
                      {log.metadata && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">metadata</summary>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}