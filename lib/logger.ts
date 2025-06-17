import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface LogSubscriber {
  id: string;
  callback: (log: LogEntry) => void;
}

class LogManager {
  private logs: LogEntry[] = [];
  private subscribers: LogSubscriber[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  // Add a new log entry
  log(level: LogEntry['level'], message: string, source?: string, metadata?: Record<string, unknown>) {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      message,
      source,
      metadata
    };

    // Add to in-memory buffer
    this.logs.push(logEntry);

    // Trim logs if we exceed max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const sourceStr = source ? `[${source}]` : '';
      console.log(`${timestamp} ${level.toUpperCase()} ${sourceStr} ${message}`, metadata || '');
    }

    // Notify all subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(logEntry);
      } catch (error) {
        console.error('Error notifying log subscriber:', error);
      }
    });
  }

  // Convenience methods
  info(message: string, source?: string, metadata?: Record<string, unknown>) {
    this.log('info', message, source, metadata);
  }

  warn(message: string, source?: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, source, metadata);
  }

  error(message: string, source?: string, metadata?: Record<string, unknown>) {
    this.log('error', message, source, metadata);
  }

  debug(message: string, source?: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, source, metadata);
  }

  // Subscribe to new logs
  subscribe(callback: (log: LogEntry) => void): string {
    const id = `subscriber-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.push({ id, callback });
    return id;
  }

  // Unsubscribe from logs
  unsubscribe(id: string) {
    this.subscribers = this.subscribers.filter(sub => sub.id !== id);
  }

  // Get recent logs
  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Get logs by level
  getLogsByLevel(level: LogEntry['level'], limit = 100): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit);
  }

  // Get logs by source
  getLogsBySource(source: string, limit = 100): LogEntry[] {
    return this.logs
      .filter(log => log.source === source)
      .slice(-limit);
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
  }

  // Get subscriber count
  getSubscriberCount(): number {
    return this.subscribers.length;
  }
}

// True global singleton - survives module reloading
declare global {
  interface GlobalThis {
    __logger?: LogManager;
  }
}

// Export singleton instance - reuse existing or create new
export const logger = globalThis.__logger ?? (globalThis.__logger = new LogManager());

// Export type for external use
export type { LogManager };