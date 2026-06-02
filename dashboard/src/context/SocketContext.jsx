import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { API_BASE } from "../api/client.js";

const SocketContext = createContext(null);

/**
 * useSocket — returns the shared Socket.IO instance (or null while disconnected).
 * Always guard usage: const socket = useSocket(); if (!socket) return;
 */
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  // Keep a ref so the cleanup inside useEffect always has the latest socket,
  // preventing the case where a stale closure disconnects a fresh socket.
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      // Disconnect any lingering socket when user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Disconnect previous socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const token = localStorage.getItem("dashboard_token");
    if (!token) {
      setSocket(null);
      return;
    }

    const newSocket = io(API_BASE, {
      auth: {
        type: "agent",
        token
      },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ["polling", "websocket"],
      withCredentials: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]); // depend on user ID, not the full user object to avoid stale triggers

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
