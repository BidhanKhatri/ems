import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    // Determine the socket URL based on the environment (stripping /api suffix if present)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api$/, '');
    
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      
      // Join user room if logged in
      if (user?._id) {
        newSocket.emit('join', user._id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle re-joining when user changes (login/logout)
  useEffect(() => {
    if (socket && isConnected && user?._id) {
      socket.emit('join', user._id);
    }
  }, [socket, isConnected, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
