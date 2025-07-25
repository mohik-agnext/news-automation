import { RealtimeUpdate } from '@/types/session';

// Store active SSE connections with comprehensive state tracking
interface SSEConnectionData {
  active: boolean; 
  keepAliveId?: NodeJS.Timeout;
  lastActivity: number;
  closed: boolean;
}

const sseConnections = new Map<ReadableStreamDefaultController, SSEConnectionData>();

// Utility function to safely check if controller is writable
function isControllerWritable(controller: ReadableStreamDefaultController): boolean {
  try {
    // Check if controller exists and has the expected methods
    if (!controller || typeof controller.enqueue !== 'function') {
      return false;
    }
    
    // Check our internal state tracking
    const connectionData = sseConnections.get(controller);
    if (!connectionData || !connectionData.active || connectionData.closed) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Send SSE message with robust error handling
function sendSSEMessage(controller: ReadableStreamDefaultController, update: RealtimeUpdate) {
  if (!isControllerWritable(controller)) {
    removeSSEConnection(controller);
    return;
  }
  
  try {
    const message = `data: ${JSON.stringify(update)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
    
    // Update last activity
    const connectionData = sseConnections.get(controller);
    if (connectionData) {
      connectionData.lastActivity = Date.now();
    }
  } catch {
    // Silently remove the connection without logging (normal behavior when clients disconnect)
    removeSSEConnection(controller);
  }
}

// Broadcast update to all active connections
export function broadcastUpdate(update: RealtimeUpdate) {
  const controllersToRemove: ReadableStreamDefaultController[] = [];
  
  sseConnections.forEach((connectionData, controller) => {
    if (!isControllerWritable(controller)) {
      controllersToRemove.push(controller);
    } else {
      sendSSEMessage(controller, update);
    }
  });
  
  // Clean up invalid connections
  controllersToRemove.forEach(controller => {
    removeSSEConnection(controller);
  });
}

// Add SSE connection with comprehensive tracking
export function addSSEConnection(controller: ReadableStreamDefaultController) {
  const connectionData: SSEConnectionData = {
    active: true,
    lastActivity: Date.now(),
    closed: false
  };
  
  sseConnections.set(controller, connectionData);
  
  // Set up keep-alive with proper error handling
  const keepAliveId = setInterval(() => {
    if (!isControllerWritable(controller)) {
      removeSSEConnection(controller);
      return;
    }
    
    try {
      controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
      connectionData.lastActivity = Date.now();
    } catch {
      removeSSEConnection(controller);
    }
  }, 30000);
  
  connectionData.keepAliveId = keepAliveId;
  
  console.log(`🔗 SSE connection established. Total connections: ${sseConnections.size}`);
}

// Remove SSE connection with cleanup
export function removeSSEConnection(controller: ReadableStreamDefaultController) {
  const connectionData = sseConnections.get(controller);
  
  if (connectionData) {
    connectionData.active = false;
    connectionData.closed = true;
    
    if (connectionData.keepAliveId) {
      clearInterval(connectionData.keepAliveId);
    }
  }
  
  sseConnections.delete(controller);
}

// Create SSE stream with proper lifecycle management
export function createSSEStream() {
  let streamController: ReadableStreamDefaultController | null = null;
  
  return new ReadableStream({
    start(controller) {
      streamController = controller;
      addSSEConnection(controller);
      
      // Send initial connection message
      try {
        controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
      } catch {
        removeSSEConnection(controller);
      }
    },
    
    cancel() {
      if (streamController) {
        removeSSEConnection(streamController);
      }
    }
  });
}

// Clean up stale connections periodically
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes
  
  const staleConnections: ReadableStreamDefaultController[] = [];
  sseConnections.forEach((data, controller) => {
    if (now - data.lastActivity > staleThreshold || data.closed) {
      staleConnections.push(controller);
    }
  });
  
  staleConnections.forEach(controller => {
    removeSSEConnection(controller);
  });
  
  if (staleConnections.length > 0) {
    console.log(`🧹 Cleaned up ${staleConnections.length} stale SSE connections`);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export function getActiveConnectionsCount(): number {
  // Filter out inactive connections
  let activeCount = 0;
  sseConnections.forEach((data, controller) => {
    if (data.active && isControllerWritable(controller)) {
      activeCount++;
    }
  });
  return activeCount;
}