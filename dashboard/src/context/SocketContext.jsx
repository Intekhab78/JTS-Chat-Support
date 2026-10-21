import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { getApiBase, REMOTE_API_URL, canReachLocalApi, setActiveApiBase } from "../api/client.js";

const SocketContext = createContext(null);

function getSocketTransports(apiBase) {
  const envTransport = import.meta.env.VITE_SOCKET_TRANSPORT;
  if (envTransport) {
    return envTransport.split(",").map((s) => s.trim());
  }

  try {
    const { hostname } = new URL(apiBase);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return ["polling", "websocket"];
    }
  } catch {
    // Fall back to polling for malformed/relative URLs.
  }

  // Remote servers (such as Nginx reverse proxies without websocket upgrade configured)
  // return 400 Bad Request on websocket handshakes. Polling ensures reliable real-time updates.
  return ["polling"];
}

/**
 * useSocket — returns the shared Socket.IO instance (or null while disconnected).
 * Always guard usage: const socket = useSocket(); if (!socket) return;
 */
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const currentBaseRef = useRef("");

  const connectSocket = useCallback((targetBase) => {
    if (!user) return;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("dashboard_token") : null;
    if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    currentBaseRef.current = targetBase;
    const transports = getSocketTransports(targetBase);
    const isRemotePollingOnly = transports.length === 1 && transports[0] === "polling";

    const newSocket = io(targetBase, {
      auth: {
        type: "agent",
        token
      },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports,
      upgrade: !isRemotePollingOnly,
      withCredentials: true
    });

    newSocket.on("connect_error", async (err) => {
      // If local socket fails to connect, test if local backend is down and fail over to cloud
      const isLocal = targetBase.includes("localhost") || targetBase.includes("127.0.0.1");
      if (isLocal) {
        const isUp = await canReachLocalApi();
        if (!isUp) {
          console.warn("[Socket] Local backend connection failed. Seamlessly failing over socket to cloud...");
          setActiveApiBase(REMOTE_API_URL, "socket_connection_failover");
        }
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    let isMounted = true;
    getApiBase().then((apiBase) => {
      if (isMounted) {
        connectSocket(apiBase);
      }
    });

    // Listen to intelligent backend-switch events
    const handleBackendSwitch = (e) => {
      const newBase = e.detail?.apiBase;
      if (newBase && newBase !== currentBaseRef.current) {
        console.info(`[Socket] Reconnecting socket to active backend: ${newBase}`);
        connectSocket(newBase);
      }
    };

    window.addEventListener("backend-switch", handleBackendSwitch);

    return () => {
      isMounted = false;
      window.removeEventListener("backend-switch", handleBackendSwitch);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?._id, connectSocket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
