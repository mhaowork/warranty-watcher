import { logger, LogEntry } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Log stream connected',
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Send recent logs immediately upon connection
      const recentLogs = logger.getRecentLogs(50);
      recentLogs.forEach(log => {
        const message = `data: ${JSON.stringify({
          type: 'log',
          ...log
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      });

      // Subscribe to new logs
      const subscriptionId = logger.subscribe((log: LogEntry) => {
        try {
          const message = `data: ${JSON.stringify({
            type: 'log',
            ...log
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          console.error('Error streaming log:', error);
        }
      });

      // Handle client disconnect
      const cleanup = () => {
        logger.unsubscribe(subscriptionId);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };

      // Store cleanup function for potential use
      // Note: This is a simplified approach. In production, you might want
      // to track connections more robustly
      return cleanup;
    },
    cancel() {
      // This will be called when the client disconnects
      logger.info('Log stream client disconnected', 'logger-api');
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}