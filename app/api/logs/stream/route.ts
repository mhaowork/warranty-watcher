import { logger, LogEntry } from '@/lib/logger';
import { isSaaSMode } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Disable log streaming in SaaS mode for security reasons
  // In SaaS mode, the global logger contains logs from all users
  if (isSaaSMode()) {
    return new Response(
      JSON.stringify({ 
        error: 'Log streaming is disabled in SaaS mode for security reasons' 
      }), 
      { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      let isControllerClosed = false;
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Log stream connected',
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Send recent logs immediately upon connection
      const recentLogs = logger.getRecentLogs(50);
      recentLogs.forEach((log: LogEntry) => {
        if (!isControllerClosed) {
          const message = `data: ${JSON.stringify({
            type: 'log',
            ...log
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        }
      });

      // Subscribe to new logs
      const subscriptionId = logger.subscribe((log: LogEntry) => {
        if (isControllerClosed) {
          return; // Don't try to send if controller is closed
        }
        
        try {
          const message = `data: ${JSON.stringify({
            type: 'log',
            ...log
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          // Mark controller as closed if we get an error
          if (error instanceof TypeError && error.message.includes('Controller is already closed')) {
            isControllerClosed = true;
            logger.unsubscribe(subscriptionId);
          } else {
            console.error('Error streaming log:', error);
          }
        }
      });

      // Handle client disconnect cleanup
      return () => {
        isControllerClosed = true;
        logger.unsubscribe(subscriptionId);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };
    },
    cancel() {}
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