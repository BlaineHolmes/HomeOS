import { useEffect, useRef, useState, useCallback } from 'react';

// WebSocket message types matching the server
export interface WebSocketMessage {
  type: 'generator_status' | 'generator_control' | 'system_status' | 'error' | 'ping' | 'pong' | 'weather_update' | 'energy_update' | 'calendar_update';
  data?: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketHookOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface WebSocketHookReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: WebSocketMessage) => void;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Custom hook for WebSocket connection with auto-reconnect and message handling
 */
export const useWebSocket = (options: WebSocketHookOptions = {}): WebSocketHookReturn => {
  const {
    url = 'ws://localhost:3001/ws',
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setSocket(ws);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();

        // Auto-reconnect if not manually closed
        if (shouldReconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
        onError?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle ping/pong automatically
          if (message.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
              id: message.id,
            }));
            return;
          }

          onMessage?.(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onConnect, onDisconnect, onError, onMessage, isConnecting, socket]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        setError('Failed to send message');
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    shouldReconnect.current = true;
    reconnectAttempts.current = 0;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (socket) {
      socket.close();
    }
    connect();
  }, [connect, socket]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (socket) {
      socket.close();
    }
    setSocket(null);
    setIsConnected(false);
  }, [socket]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    disconnect,
  };
};

/**
 * Hook for specific data types with WebSocket updates
 */
export const useWebSocketData = <T>(
  dataType: string,
  initialData: T | null = null,
  fetchUrl?: string
) => {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch initial data
  useEffect(() => {
    if (fetchUrl) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const response = await fetch(fetchUrl);
          const result = await response.json();
          
          if (result.success && result.data) {
            setData(result.data);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch ${dataType} data:`, error);
        } finally {
          setLoading(false);
          setLastUpdate(new Date());
        }
      };

      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchUrl, dataType]);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === `${dataType}_update` && message.data) {
        setData(message.data);
        setLastUpdate(new Date());
        setLoading(false);
      }
    },
  });

  return {
    data,
    loading,
    lastUpdate,
    isConnected,
    refetch: fetchUrl ? async () => {
      try {
        setLoading(true);
        const response = await fetch(fetchUrl);
        const result = await response.json();
        
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error(`❌ Failed to refetch ${dataType} data:`, error);
      } finally {
        setLoading(false);
        setLastUpdate(new Date());
      }
    } : undefined,
  };
};
