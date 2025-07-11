import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeUpdate } from '@/types/session';

interface RealtimeState {
  isConnected: boolean;
  lastUpdate: RealtimeUpdate | null;
  newArticlesCount: number;
  connectionError: string | null;
}

export function useRealtime() {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    lastUpdate: null,
    newArticlesCount: 0,
    connectionError: null
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const [notifications, setNotifications] = useState<RealtimeUpdate[]>([]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/sse');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionError: null
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data);
        
        setState(prev => ({
          ...prev,
          lastUpdate: update,
          newArticlesCount: update.type === 'new_articles' ? 
            (update.data?.totalCount || 0) : prev.newArticlesCount
        }));

        // Add to notifications if it's a new articles update
        if (update.type === 'new_articles') {
          setNotifications(prev => [update, ...prev].slice(0, 10)); // Keep last 10 notifications
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionError: 'Connection lost. Attempting to reconnect...'
      }));
      
      // Retry connection after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connect();
        }
      }, 5000);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    newArticlesCount: state.newArticlesCount,
    connectionError: state.connectionError,
    notifications,
    connect,
    disconnect,
    clearNotifications,
    dismissNotification
  };
} 