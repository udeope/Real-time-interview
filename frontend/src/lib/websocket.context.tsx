'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket, UseWebSocketOptions } from '@/hooks/useWebSocket';

interface WebSocketContextType extends ReturnType<typeof useWebSocket> {}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  options?: UseWebSocketOptions;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  options = {} 
}) => {
  const webSocketState = useWebSocket(options);

  return (
    <WebSocketContext.Provider value={webSocketState}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};